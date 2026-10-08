/* ====================================================
   Main Application Logic - Review 2 (Full Stack + Gemini AI)
   AI Mock Interview Simulator
   ==================================================== */

// ========== GLOBAL VARIABLES ==========
var currentQuestionIndex = 0;
var selectedQuestions = [];
var userAnswers = [];
var timerInterval = null;
var timeRemaining = 0;
var timeLimit = 120;
var isAnswerSubmitted = false;
var currentUser = null;

// ========== USER AUTHENTICATION & NAVIGATION ==========

/**
 * Check if a candidate is logged in and update the navbar
 */
function checkUserAuth() {
    fetch('api/auth.php?action=me')
        .then(function(res) { return res.json(); })
        .then(function(data) {
            var container = document.getElementById('authNavContainer');
            if (data.authenticated && data.user) {
                currentUser = data.user;
                if (container) {
                    container.innerHTML = 
                        '<div class="user-menu">' +
                            '<span class="user-greeting">' + escapeHtml(currentUser.full_name || currentUser.username) + '</span>' +
                            '<button class="btn-nav-logout" onclick="handleLogout()">Logout</button>' +
                        '</div>';
                }
                var nameInput = document.getElementById('candidateName');
                if (nameInput && !nameInput.value) {
                    nameInput.value = currentUser.full_name || currentUser.username;
                }
            } else {
                currentUser = null;
                if (container) {
                    container.innerHTML = '<a href="login.html" class="btn-nav-auth">Login</a>';
                }
            }
        })
        .catch(function(err) {
            console.log('Auth check note: Running in client-only mode or server not ready.');
        });
}

/**
 * Switch tabs on login.html (Login vs Register)
 */
function switchAuthTab(tab) {
    var tabLoginBtn = document.getElementById('tabLoginBtn');
    var tabRegBtn = document.getElementById('tabRegisterBtn');
    var loginForm = document.getElementById('loginForm');
    var regForm = document.getElementById('registerForm');
    var alertBox = document.getElementById('authAlert');

    if (alertBox) {
        alertBox.className = 'auth-alert';
        alertBox.style.display = 'none';
    }

    if (tab === 'login') {
        tabLoginBtn.classList.add('active');
        tabRegBtn.classList.remove('active');
        loginForm.style.display = 'block';
        regForm.style.display = 'none';
    } else {
        tabRegBtn.classList.add('active');
        tabLoginBtn.classList.remove('active');
        loginForm.style.display = 'none';
        regForm.style.display = 'block';
    }
}

/**
 * Handle candidate login form submit
 */
function handleAuthLogin(e) {
    e.preventDefault();
    var username = document.getElementById('loginUsername').value.trim();
    var password = document.getElementById('loginPassword').value;
    var btn = document.getElementById('loginSubmitBtn');
    var alertBox = document.getElementById('authAlert');

    btn.disabled = true;
    btn.textContent = 'Signing in...';

    fetch('api/auth.php?action=login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username, password: password })
    })
    .then(function(res) { return res.json(); })
    .then(function(data) {
        btn.disabled = false;
        btn.textContent = 'Sign In';
        if (data.success) {
            alertBox.className = 'auth-alert success';
            alertBox.textContent = 'Login successful! Redirecting...';
            setTimeout(function() {
                window.location.href = 'setup.html';
            }, 800);
        } else {
            alertBox.className = 'auth-alert error';
            alertBox.textContent = data.message || 'Login failed.';
        }
    })
    .catch(function(err) {
        btn.disabled = false;
        btn.textContent = 'Sign In';
        alertBox.className = 'auth-alert error';
        alertBox.textContent = 'Network or server error. Please check your connection and try again.';
    });
}

/**
 * Handle candidate registration form submit
 */
function handleAuthRegister(e) {
    e.preventDefault();
    var fullName = document.getElementById('regFullName').value.trim();
    var username = document.getElementById('regUsername').value.trim();
    var email = document.getElementById('regEmail').value.trim();
    var password = document.getElementById('regPassword').value;
    var btn = document.getElementById('regSubmitBtn');
    var alertBox = document.getElementById('authAlert');

    btn.disabled = true;
    btn.textContent = 'Creating Account...';

    fetch('api/auth.php?action=register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            full_name: fullName,
            username: username,
            email: email,
            password: password
        })
    })
    .then(function(res) { return res.json(); })
    .then(function(data) {
        btn.disabled = false;
        btn.textContent = 'Create Account';
        if (data.success) {
            alertBox.className = 'auth-alert success';
            alertBox.textContent = 'Account created successfully! Redirecting...';
            setTimeout(function() {
                window.location.href = 'setup.html';
            }, 800);
        } else {
            alertBox.className = 'auth-alert error';
            alertBox.textContent = data.message || 'Registration failed.';
        }
    })
    .catch(function(err) {
        btn.disabled = false;
        btn.textContent = 'Create Account';
        alertBox.className = 'auth-alert error';
        alertBox.textContent = 'Network or server error. Please check your connection and try again.';
    });
}

/**
 * Handle logout
 */
function handleLogout() {
    fetch('api/auth.php?action=logout', { method: 'POST' })
        .then(function() {
            window.location.reload();
        })
        .catch(function() {
            window.location.reload();
        });
}


// ========== SETUP PAGE LOGIC ==========

/**
 * Initialize setup page
 */
function initSetupPage() {
    // Support URL parameters for seamless continuation (e.g., setup.html?category=technical&batch=2)
    var urlParams = new URLSearchParams(window.location.search);
    var catParam = urlParams.get('category');
    var batchParam = urlParams.get('batch');
    var diffParam = urlParams.get('difficulty');
    if (catParam) {
        var catElem = document.getElementById('category');
        if (catElem) catElem.value = catParam;
    }
    if (diffParam) {
        var diffElem = document.getElementById('difficulty');
        if (diffElem) diffElem.value = diffParam;
    }
    if (batchParam) {
        var batchElem = document.getElementById('questionBatch');
        if (batchElem) batchElem.value = batchParam;
    }

    var form = document.getElementById('setupForm');
    if (form) {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            startInterview();
        });
    }
}

/**
 * Start the interview - load questions dynamically from MySQL DB and start session
 */
function startInterview() {
    var category = document.getElementById('category').value;
    var difficulty = document.getElementById('difficulty').value;
    var batchElem = document.getElementById('questionBatch');
    var batchVal = batchElem ? batchElem.value : '1';
    var timeLimitVal = parseInt(document.getElementById('timeLimit').value);
    var candidateName = document.getElementById('candidateName').value.trim();
    var startBtn = document.getElementById('startBtn');

    if (!category || !difficulty) {
        alert('Please select a category and difficulty level.');
        return;
    }

    if (!candidateName && currentUser) {
        candidateName = currentUser.full_name || currentUser.username;
    }

    var batchNum = parseInt(batchVal);
    var numQuestions = 30;
    var order = 'sequential';
    var batch = null;

    if (!isNaN(batchNum) && batchNum >= 1 && batchNum <= 4) {
        batch = batchNum;
        numQuestions = 30;
        order = 'sequential';
    } else if (batchVal === 'quick_5') {
        numQuestions = 5;
        order = 'random';
    } else if (batchVal === 'quick_10') {
        numQuestions = 10;
        order = 'random';
    } else if (batchVal === 'random_30') {
        numQuestions = 30;
        order = 'random';
    }

    startBtn.disabled = true;
    startBtn.textContent = 'Loading questions from database...';

    // Fetch dynamic questions from MySQL backend
    var apiUrl = 'api/get_questions.php?category=' + encodeURIComponent(category) +
                 '&difficulty=' + encodeURIComponent(difficulty) +
                 '&limit=' + encodeURIComponent(numQuestions) +
                 '&order=' + encodeURIComponent(order);

    if (batch !== null) {
        apiUrl += '&batch=' + encodeURIComponent(batch);
    }

    fetch(apiUrl)
        .then(function(res) { return res.json(); })
        .then(function(data) {
            var questions = [];
            if (data.success && data.questions && data.questions.length > 0) {
                questions = data.questions;
            } else {
                // Fallback to local question bank if DB returns empty
                questions = getFilteredQuestions(category, difficulty);
                questions = shuffleArray(questions).slice(0, numQuestions);
            }
            proceedToInterview(category, difficulty, timeLimitVal, candidateName, questions, batch, batchVal);
        })
        .catch(function(err) {
            console.log('Backend unreachable, using local question bank fallback:', err);
            var questions = getFilteredQuestions(category, difficulty);
            questions = shuffleArray(questions).slice(0, numQuestions);
            proceedToInterview(category, difficulty, timeLimitVal, candidateName, questions, batch, batchVal);
        });
}

function proceedToInterview(category, difficulty, timeLimitVal, candidateName, questions, batch, batchVal) {
    if (!questions || questions.length === 0) {
        alert('No questions found for the selected criteria. Please try different settings.');
        var startBtn = document.getElementById('startBtn');
        if (startBtn) {
            startBtn.disabled = false;
            startBtn.textContent = 'Start Interview →';
        }
        return;
    }

    var interviewSettings = {
        category: category,
        difficulty: difficulty,
        numQuestions: questions.length,
        timeLimit: timeLimitVal,
        candidateName: candidateName,
        batch: batch,
        batchVal: batchVal,
        questions: questions,
        startTime: new Date().toISOString()
    };

    localStorage.setItem('interviewSettings', JSON.stringify(interviewSettings));
    localStorage.removeItem('interviewResults');

    window.location.href = 'interview.html';
}

/**
 * Filter questions based on category and difficulty (Fallback)
 */
function getFilteredQuestions(category, difficulty) {
    if (typeof questionBank === 'undefined') return [];
    var questions = [];

    if (category === 'all') {
        questions = questionBank.hr.concat(questionBank.technical, questionBank.behavioral);
    } else {
        questions = questionBank[category] || [];
    }

    if (difficulty !== 'all') {
        questions = questions.filter(function(q) {
            return q.difficulty === difficulty;
        });
    }

    return questions.map(function(q) {
        var cat = 'HR';
        if (questionBank.technical.some(function(tq) { return tq.id === q.id; })) {
            cat = 'Technical';
        } else if (questionBank.behavioral.some(function(bq) { return bq.id === q.id; })) {
            cat = 'Behavioral';
        }

        return {
            id: q.id,
            question: q.question,
            difficulty: q.difficulty,
            modelAnswer: q.modelAnswer,
            tips: q.tips,
            category: cat
        };
    });
}

function shuffleArray(arr) {
    var array = arr.slice();
    for (var i = array.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var temp = array[i];
        array[i] = array[j];
        array[j] = temp;
    }
    return array;
}


// ========== INTERVIEW PAGE LOGIC ==========

/**
 * Initialize the interview page
 */
function initInterviewPage() {
    var settings = localStorage.getItem('interviewSettings');
    if (!settings) {
        alert('No interview settings found. Please set up your interview first.');
        window.location.href = 'setup.html';
        return;
    }

    var config = JSON.parse(settings);
    selectedQuestions = config.questions;
    timeLimit = config.timeLimit;
    currentQuestionIndex = 0;
    userAnswers = [];

    for (var i = 0; i < selectedQuestions.length; i++) {
        userAnswers.push({
            questionId: selectedQuestions[i].id,
            question: selectedQuestions[i].question,
            category: selectedQuestions[i].category,
            difficulty: selectedQuestions[i].difficulty,
            modelAnswer: selectedQuestions[i].modelAnswer,
            tips: selectedQuestions[i].tips,
            answer: '',
            rating: 0,
            skipped: false,
            timeSpent: 0,
            aiScore: null,
            aiLabel: null,
            aiFeedback: null,
            aiStrengths: null,
            aiImprovements: null
        });
    }

    showQuestion(0);
}

/**
 * Display a specific question
 */
function showQuestion(index) {
    if (index >= selectedQuestions.length) {
        finishInterview();
        return;
    }

    currentQuestionIndex = index;
    isAnswerSubmitted = false;
    var q = selectedQuestions[index];

    var settings = JSON.parse(localStorage.getItem('interviewSettings') || '{}');
    var counterText = 'Question ' + (index + 1) + ' of ' + selectedQuestions.length;
    if (settings.batch) {
        counterText = 'Set ' + settings.batch + ' · ' + counterText;
    }
    document.getElementById('questionCounter').textContent = counterText;

    var progress = ((index) / selectedQuestions.length) * 100;
    document.getElementById('progressFill').style.width = progress + '%';

    document.getElementById('questionCategory').textContent = q.category;

    var diffBadge = document.getElementById('questionDifficulty');
    diffBadge.textContent = q.difficulty.charAt(0).toUpperCase() + q.difficulty.slice(1);
    diffBadge.className = 'question-difficulty difficulty-' + q.difficulty;

    document.getElementById('questionText').textContent = q.question;

    var answerInput = document.getElementById('answerInput');
    answerInput.value = userAnswers[index].answer || '';
    answerInput.disabled = false;
    answerInput.focus();

    // Hide AI evaluation, model answer, and self rating
    var aiBox = document.getElementById('aiEvaluationBox');
    if (aiBox) aiBox.classList.remove('show');
    var aiLoading = document.getElementById('aiLoadingBox');
    if (aiLoading) aiLoading.classList.remove('show');
    document.getElementById('modelAnswer').classList.remove('show');
    document.getElementById('selfRating').classList.remove('show');

    // Button states
    document.getElementById('submitBtn').classList.remove('hidden');
    document.getElementById('skipBtn').classList.remove('hidden');
    document.getElementById('nextBtn').classList.add('hidden');

    var ratingBtns = document.querySelectorAll('.rating-options button');
    for (var i = 0; i < ratingBtns.length; i++) {
        ratingBtns[i].classList.remove('selected');
    }

    startTimer();
}

/**
 * Start the countdown timer
 */
function startTimer() {
    if (timerInterval) clearInterval(timerInterval);

    var timerDisplay = document.getElementById('timerDisplay');
    var timerBox = document.getElementById('timerBox');

    if (timeLimit === 0) {
        timerDisplay.textContent = '∞';
        timerBox.classList.remove('warning');
        return;
    }

    timeRemaining = timeLimit;
    updateTimerDisplay();

    timerInterval = setInterval(function() {
        timeRemaining--;
        updateTimerDisplay();

        if (timeRemaining <= 30) {
            timerBox.classList.add('warning');
        } else {
            timerBox.classList.remove('warning');
        }

        if (timeRemaining <= 0) {
            clearInterval(timerInterval);
            if (!isAnswerSubmitted) {
                alert('Time limit reached. Your answer has been auto-submitted for evaluation.');
                submitAnswer();
            }
        }
    }, 1000);
}

function updateTimerDisplay() {
    var minutes = Math.floor(timeRemaining / 60);
    var seconds = timeRemaining % 60;
    var display = (minutes < 10 ? '0' : '') + minutes + ':' + (seconds < 10 ? '0' : '') + seconds;
    document.getElementById('timerDisplay').textContent = display;
}

/**
 * Submit the current answer and trigger real-time Google Gemini AI Evaluation
 */
function submitAnswer() {
    if (isAnswerSubmitted) return;
    isAnswerSubmitted = true;

    if (timerInterval) clearInterval(timerInterval);

    var answerText = document.getElementById('answerInput').value.trim();
    var q = selectedQuestions[currentQuestionIndex];

    userAnswers[currentQuestionIndex].answer = answerText;
    userAnswers[currentQuestionIndex].timeSpent = timeLimit > 0 ? (timeLimit - timeRemaining) : 0;
    userAnswers[currentQuestionIndex].skipped = false;

    document.getElementById('answerInput').disabled = true;

    // Show Reference Model Answer
    document.getElementById('modelAnswerText').textContent = q.modelAnswer;
    document.getElementById('tipsText').textContent = q.tips;
    document.getElementById('modelAnswer').classList.add('show');

    // Show Self-Rating Section
    document.getElementById('selfRating').classList.add('show');

    // Toggle Action Buttons
    document.getElementById('submitBtn').classList.add('hidden');
    document.getElementById('skipBtn').classList.add('hidden');
    document.getElementById('nextBtn').classList.remove('hidden');

    // Show AI Loading Spinner
    var aiLoadingBox = document.getElementById('aiLoadingBox');
    var aiBox = document.getElementById('aiEvaluationBox');
    if (aiLoadingBox) aiLoadingBox.classList.add('show');

    // Call Google Gemini API through PHP backend
    fetch('api/evaluate_answer.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            question: q.question,
            model_answer: q.modelAnswer,
            user_answer: answerText,
            category: q.category,
            difficulty: q.difficulty
        })
    })
    .then(function(res) { return res.json(); })
    .then(function(data) {
        if (aiLoadingBox) aiLoadingBox.classList.remove('show');
        if (data.success && data.ai_evaluation && aiBox) {
            var ev = data.ai_evaluation;
            userAnswers[currentQuestionIndex].aiScore = ev.score;
            userAnswers[currentQuestionIndex].aiLabel = ev.rating_label;
            userAnswers[currentQuestionIndex].aiFeedback = ev.feedback;
            userAnswers[currentQuestionIndex].aiStrengths = ev.strengths;
            userAnswers[currentQuestionIndex].aiImprovements = ev.improvements;

            document.getElementById('aiScoreDisplay').textContent = ev.score;
            document.getElementById('aiLabelDisplay').textContent = ev.rating_label;
            document.getElementById('aiFeedbackDisplay').textContent = ev.feedback;
            document.getElementById('aiStrengthsDisplay').textContent = ev.strengths || 'None';
            document.getElementById('aiImprovementsDisplay').textContent = ev.improvements || 'None';

            var modelBadge = document.getElementById('aiModelBadge');
            if (modelBadge) {
                modelBadge.textContent = data.source === 'gemini_ai' ? 'Gemini 3.8 Flash' : 'NLP Evaluator';
            }

            aiBox.classList.add('show');
            aiBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    })
    .catch(function(err) {
        console.error('Error in AI evaluation:', err);
        if (aiLoadingBox) aiLoadingBox.classList.remove('show');
    });
}

function skipQuestion() {
    if (timerInterval) clearInterval(timerInterval);

    userAnswers[currentQuestionIndex].skipped = true;
    userAnswers[currentQuestionIndex].answer = '';
    userAnswers[currentQuestionIndex].rating = 0;
    userAnswers[currentQuestionIndex].aiScore = 0;

    nextQuestion();
}

function rateAnswer(rating) {
    userAnswers[currentQuestionIndex].rating = rating;

    var ratingBtns = document.querySelectorAll('.rating-options button');
    for (var i = 0; i < ratingBtns.length; i++) {
        ratingBtns[i].classList.remove('selected');
        if (parseInt(ratingBtns[i].getAttribute('data-rating')) === rating) {
            ratingBtns[i].classList.add('selected');
        }
    }
}

function nextQuestion() {
    currentQuestionIndex++;
    if (currentQuestionIndex >= selectedQuestions.length) {
        finishInterview();
    } else {
        showQuestion(currentQuestionIndex);
    }
}

/**
 * Finish interview - save to localStorage AND persist to MySQL Database
 */
function finishInterview() {
    if (timerInterval) clearInterval(timerInterval);

    var settings = JSON.parse(localStorage.getItem('interviewSettings'));
    var results = {
        candidateName: settings.candidateName,
        category: settings.category,
        difficulty: settings.difficulty,
        batch: settings.batch,
        batchVal: settings.batchVal,
        totalQuestions: selectedQuestions.length,
        answers: userAnswers,
        endTime: new Date().toISOString(),
        startTime: settings.startTime
    };

    localStorage.setItem('interviewResults', JSON.stringify(results));

    // Persist session to MySQL database via PHP backend
    fetch('api/save_session.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(results)
    })
    .then(function(res) { return res.json(); })
    .then(function(dbRes) {
        console.log('Session saved to database:', dbRes);
        window.location.href = 'results.html';
    })
    .catch(function(err) {
        console.log('Note: Saved locally. DB save note:', err);
        window.location.href = 'results.html';
    });
}


// ========== RESULTS PAGE LOGIC ==========

function initResultsPage() {
    var resultsData = localStorage.getItem('interviewResults');
    if (!resultsData) {
        alert('No results found. Please complete an interview first.');
        window.location.href = 'setup.html';
        return;
    }

    var results = JSON.parse(resultsData);
    displayResults(results);
}

function displayResults(results) {
    var greeting = document.getElementById('candidateGreeting');
    var batchText = results.batch ? (' · Set ' + results.batch + ' (30 Questions)') : '';
    if (results.candidateName) {
        greeting.textContent = 'Great effort, ' + escapeHtml(results.candidateName) + '!' + batchText + ' Here\'s your performance and Gemini AI review.';
    } else if (results.batch) {
        greeting.textContent = 'Performance Summary' + batchText;
    }

    var answered = 0;
    var skipped = 0;
    var totalSelfRating = 0;
    var selfRatedCount = 0;
    var totalAiScore = 0;
    var aiRatedCount = 0;

    for (var i = 0; i < results.answers.length; i++) {
        var ans = results.answers[i];
        if (ans.skipped) {
            skipped++;
        } else {
            answered++;
        }
        if (ans.rating > 0) {
            totalSelfRating += ans.rating;
            selfRatedCount++;
        }
        if (ans.aiScore !== null && ans.aiScore !== undefined && !ans.skipped) {
            totalAiScore += parseFloat(ans.aiScore);
            aiRatedCount++;
        }
    }

    document.getElementById('totalQuestions').textContent = results.totalQuestions;
    document.getElementById('answeredCount').textContent = answered;

    var avgSelf = selfRatedCount > 0 ? (totalSelfRating / selfRatedCount).toFixed(1) : '-';
    document.getElementById('avgRating').textContent = avgSelf;

    var avgAi = aiRatedCount > 0 ? (totalAiScore / aiRatedCount).toFixed(1) : '-';
    var aiScoreElem = document.getElementById('avgAiScore');
    if (aiScoreElem) {
        aiScoreElem.textContent = avgAi !== '-' ? (avgAi + ' / 10') : '-';
    }

    // Performance summary text
    var performanceText = document.getElementById('performanceText');
    if (avgAi !== '-') {
        var numScore = parseFloat(avgAi);
        if (numScore >= 8.0) {
            performanceText.textContent = 'Outstanding performance. Gemini evaluated your responses as thorough and articulate.';
        } else if (numScore >= 6.0) {
            performanceText.textContent = 'Solid performance. Review the feedback and improvement suggestions below to refine your answers.';
        } else {
            performanceText.textContent = 'Practice session complete. Review the suggestions and model answers below to strengthen your responses.';
        }
    } else {
        performanceText.textContent = 'Great practice session completed! Review all questions and reference model answers below.';
    }

    // Question-by-question review with AI feedback
    var reviewList = document.getElementById('reviewList');
    reviewList.innerHTML = '';

    for (var j = 0; j < results.answers.length; j++) {
        var answer = results.answers[j];
        var reviewItem = document.createElement('div');
        reviewItem.className = 'review-item';

        var ratingBadgeClass = 'rating-poor';
        var ratingLabel = 'Not Self-Rated';
        if (answer.rating === 1) { ratingBadgeClass = 'rating-poor'; ratingLabel = 'Self: 1 - Poor'; }
        else if (answer.rating === 2) { ratingBadgeClass = 'rating-average'; ratingLabel = 'Self: 2 - Average'; }
        else if (answer.rating === 3) { ratingBadgeClass = 'rating-good'; ratingLabel = 'Self: 3 - Good'; }
        else if (answer.rating === 4) { ratingBadgeClass = 'rating-excellent'; ratingLabel = 'Self: 4 - Excellent'; }

        var answerDisplay = answer.skipped 
            ? '<em>Skipped</em>' 
            : escapeHtml(answer.answer || 'No answer provided');

        // AI feedback section HTML
        var aiFeedbackHTML = '';
        if (answer.aiScore !== null && answer.aiScore !== undefined) {
            aiFeedbackHTML = 
                '<div style="margin-top: 14px; padding: 14px; background: var(--bg-subtle); border: 1px solid var(--border); border-left: 2px solid var(--border-hover); border-radius: var(--radius-sm);">' +
                    '<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">' +
                        '<strong style="color: var(--text);">Gemini AI Evaluation: ' + answer.aiScore + '/10 (' + escapeHtml(answer.aiLabel || '') + ')</strong>' +
                    '</div>' +
                    '<p style="font-size: 0.92rem; color: var(--text-secondary); margin-bottom: 6px;">' + escapeHtml(answer.aiFeedback || '') + '</p>' +
                    (answer.aiStrengths ? '<div style="font-size: 0.85rem; color: var(--text);"><strong>Strengths:</strong> ' + escapeHtml(answer.aiStrengths) + '</div>' : '') +
                    (answer.aiImprovements ? '<div style="font-size: 0.85rem; color: var(--text-muted);"><strong>To Improve:</strong> ' + escapeHtml(answer.aiImprovements) + '</div>' : '') +
                '</div>';
        }

        reviewItem.innerHTML = 
            '<h4>Q' + (j + 1) + '. ' + escapeHtml(answer.question) + '</h4>' +
            '<div class="question-meta" style="margin-bottom: 10px;">' +
                '<span class="question-category">' + escapeHtml(answer.category) + '</span>' +
                '<span class="question-difficulty difficulty-' + answer.difficulty + '">' + 
                    escapeHtml(answer.difficulty.charAt(0).toUpperCase() + answer.difficulty.slice(1)) + 
                '</span>' +
            '</div>' +
            '<div class="your-answer"><strong>Your Answer:</strong> ' + answerDisplay + '</div>' +
            (answer.skipped ? '' : '<span class="rating-badge ' + ratingBadgeClass + '">' + ratingLabel + '</span>') +
            aiFeedbackHTML;

        reviewList.appendChild(reviewItem);
    }

    // Dynamic progression button if user practiced a batch
    var actionRow = document.querySelector('.action-row');
    if (actionRow && results.batch) {
        var currentBatch = parseInt(results.batch);
        var nextBatch = currentBatch < 4 ? (currentBatch + 1) : 1;
        var nextBatchText = currentBatch < 4 
            ? ('Practice Next 30 Questions (Set ' + nextBatch + ') →') 
            : 'Restart From Set 1 (Questions 1 - 30) →';
        var nextUrl = 'setup.html?category=' + encodeURIComponent(results.category || 'all') + 
                      '&difficulty=' + encodeURIComponent(results.difficulty || 'all') + 
                      '&batch=' + nextBatch;

        actionRow.innerHTML = 
            '<a href="' + nextUrl + '" class="btn btn-primary" style="width: auto;">' + nextBatchText + '</a>' +
            '<a href="setup.html" class="btn btn-secondary" style="width: auto;">Practice Setup</a>' +
            '<a href="history.html" class="btn btn-secondary" style="width: auto;">View Past History</a>' +
            '<a href="index.html" class="btn btn-secondary">Return Home</a>';
    }
}


// ========== HISTORY PAGE LOGIC ==========

/**
 * Initialize the persistent history page
 */
function initHistoryPage() {
    var container = document.getElementById('historyListContainer');
    if (!container) return;

    fetch('api/get_history.php')
        .then(function(res) { return res.json(); })
        .then(function(data) {
            if (!data.success || !data.sessions || data.sessions.length === 0) {
                container.innerHTML = 
                    '<div class="feature-card text-center" style="padding: 40px;">' +
                        '<h3>No interview sessions recorded yet.</h3>' +
                        '<p style="color: var(--text-secondary); margin: 15px 0;">Complete your first mock interview to see persistent results here!</p>' +
                        '<a href="setup.html" class="btn btn-primary" style="width: auto;">Start Practice Now</a>' +
                    '</div>';
                return;
            }

            container.innerHTML = '';
            data.sessions.forEach(function(s) {
                var card = document.createElement('div');
                card.className = 'history-card';
                var dateStr = new Date(s.created_at).toLocaleString();

                var aiScoreDisplay = s.avg_ai_score !== null ? (s.avg_ai_score + ' / 10') : 'Not Evaluated';
                var selfScoreDisplay = s.avg_self_rating !== null ? (s.avg_self_rating + ' / 4') : 'Not Rated';

                card.innerHTML = 
                    '<div class="history-card-header">' +
                        '<div>' +
                            '<h3 style="margin-bottom: 4px;">Session #' + s.id + ' — ' + escapeHtml(s.candidate_name) + '</h3>' +
                            '<span class="history-meta">Date: ' + dateStr + ' &bull; Category: <strong>' + escapeHtml(s.category) + '</strong> &bull; Difficulty: <strong>' + escapeHtml(s.difficulty) + '</strong></span>' +
                        '</div>' +
                        '<button class="btn btn-primary" onclick="viewSessionDetails(' + s.id + ')" style="padding: 6px 14px; font-size: 0.88rem; width: auto;">' +
                            'View Details →' +
                        '</button>' +
                    '</div>' +
                    '<div class="history-scores">' +
                        '<span class="history-score-chip">Questions: <strong>' + s.answered_count + ' / ' + s.total_questions + '</strong></span>' +
                        '<span class="history-score-chip">Gemini AI Score: <strong>' + aiScoreDisplay + '</strong></span>' +
                        '<span class="history-score-chip">Avg Self-Rating: <strong>' + selfScoreDisplay + '</strong></span>' +
                    '</div>';

                container.appendChild(card);
            });
        })
        .catch(function(err) {
            container.innerHTML = 
                '<div style="text-align: center; color: var(--danger); padding: 30px;">' +
                    'Unable to load history from database. Please check your connection and try again.' +
                '</div>';
        });
}

/**
 * View detailed responses and AI reviews of a specific past session
 */
function viewSessionDetails(sessionId) {
    var modal = document.getElementById('detailsModal');
    var modalTitle = document.getElementById('modalTitle');
    var modalBody = document.getElementById('modalBody');

    modalTitle.textContent = 'Loading Session #' + sessionId + '...';
    modalBody.innerHTML = '<div style="text-align:center; padding: 20px;">Fetching session responses...</div>';
    modal.classList.add('show');

    fetch('api/get_history.php?session_id=' + sessionId)
        .then(function(res) { return res.json(); })
        .then(function(data) {
            if (!data.success || !data.session) {
                modalBody.innerHTML = '<p style="color:var(--text-muted); font-family:var(--font-mono);">Session not found.</p>';
                return;
            }

            var s = data.session;
            modalTitle.textContent = 'Session #' + s.id + ' — ' + s.candidate_name;

            var html = 
                '<div style="margin-bottom: 20px; padding: 12px; background: var(--bg); border-radius: 6px; font-size: 0.9rem;">' +
                    '<div><strong>Category:</strong> ' + escapeHtml(s.category) + ' &bull; <strong>Difficulty:</strong> ' + escapeHtml(s.difficulty) + ' &bull; <strong>Date:</strong> ' + new Date(s.created_at).toLocaleString() + '</div>' +
                    '<div><strong>AI Average:</strong> ' + (s.avg_ai_score ? s.avg_ai_score + '/10' : 'N/A') + ' &bull; <strong>Self Rating Average:</strong> ' + (s.avg_self_rating ? s.avg_self_rating + '/4' : 'N/A') + '</div>' +
                '</div>' +
                '<h4 style="margin-bottom: 12px;">Questions & Responses:</h4>';

            data.responses.forEach(function(r, idx) {
                var aiHTML = '';
                if (r.ai_score !== null) {
                    aiHTML = 
                        '<div style="margin-top: 10px; padding: 12px; background: var(--bg-subtle); border: 1px solid var(--border); border-left: 2px solid var(--border-hover); border-radius: var(--radius-sm);">' +
                            '<strong>Gemini AI Score: ' + r.ai_score + '/10 (' + escapeHtml(r.ai_label || '') + ')</strong>' +
                            '<p style="font-size: 0.9rem; margin-top: 4px;">' + escapeHtml(r.ai_feedback || '') + '</p>' +
                            (r.ai_strengths ? '<div style="font-size: 0.85rem; color: var(--text);"><strong>Strengths:</strong> ' + escapeHtml(r.ai_strengths) + '</div>' : '') +
                            (r.ai_improvements ? '<div style="font-size: 0.85rem; color: var(--text-muted);"><strong>To Improve:</strong> ' + escapeHtml(r.ai_improvements) + '</div>' : '') +
                        '</div>';
                }

                html += 
                    '<div style="margin-bottom: 20px; border-bottom: 1px solid var(--border); padding-bottom: 15px;">' +
                        '<h5>Q' + (idx + 1) + '. ' + escapeHtml(r.question_text) + '</h5>' +
                        '<div style="margin: 8px 0; font-size: 0.9rem;"><strong>Answer:</strong> ' + (r.skipped ? '<em>Skipped</em>' : escapeHtml(r.user_answer || 'None')) + '</div>' +
                        (r.self_rating > 0 ? '<div style="font-size: 0.85rem; color: var(--text-secondary);">Self-Rating: ' + r.self_rating + ' / 4</div>' : '') +
                        aiHTML +
                    '</div>';
            });

            modalBody.innerHTML = html;
        })
        .catch(function(err) {
            modalBody.innerHTML = '<p style="color:var(--text-muted); font-family:var(--font-mono);">Error loading session details.</p>';
        });
}

function closeDetailsModal() {
    var modal = document.getElementById('detailsModal');
    if (modal) modal.classList.remove('show');
}

// Utility function to escape HTML special characters
function escapeHtml(text) {
    if (!text) return '';
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}


// ========== PAGE INITIALIZATION ==========

document.addEventListener('DOMContentLoaded', function() {
    // Check user auth on all pages
    checkUserAuth();

    var path = window.location.pathname;

    if (path.indexOf('setup.html') !== -1) {
        initSetupPage();
    } else if (path.indexOf('interview.html') !== -1) {
        initInterviewPage();
    } else if (path.indexOf('results.html') !== -1) {
        initResultsPage();
    } else if (path.indexOf('history.html') !== -1) {
        initHistoryPage();
    }
});
