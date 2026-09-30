<?php
// AI Answer Evaluation API (Google Gemini Flash)
// AI Mock Interview Simulator - Review 2

require_once __DIR__ . '/config.php';

// Accept JSON or POST
$rawInput = file_get_contents('php://input');
$input = json_decode($rawInput, true);
if (!$input) {
    $input = $_POST;
}

$question = trim(isset($input['question']) ? $input['question'] : '');
$modelAnswer = trim(isset($input['model_answer']) ? $input['model_answer'] : '');
$userAnswer = trim(isset($input['user_answer']) ? $input['user_answer'] : '');
$category = trim(isset($input['category']) ? $input['category'] : 'General');
$difficulty = trim(isset($input['difficulty']) ? $input['difficulty'] : 'Medium');

if (empty($question)) {
    jsonResponse(['success' => false, 'message' => 'Question is required.'], 400);
}

// If user didn't write an answer
if (empty($userAnswer)) {
    jsonResponse([
        'success' => true,
        'ai_evaluation' => [
            'score' => 0,
            'rating_label' => 'No Answer',
            'feedback' => 'No answer was provided for this question. Review the model answer and key tips to prepare.',
            'strengths' => 'None provided.',
            'improvements' => 'Try to formulate an answer using key concepts from the model answer.'
        ]
    ]);
}

// Prepare prompt for Gemini
$systemInstruction = "You are a professional hiring manager and interview coach evaluating a candidate in a mock interview.
Evaluate the candidate's answer against the given question and reference model answer.
Provide an objective, constructive evaluation.

CRITICAL: Return ONLY valid JSON with no markdown backticks, no code fence, and no surrounding text.
The JSON must follow this exact schema:
{
  \"score\": <number from 1 to 10>,
  \"rating_label\": <\"Poor\" | \"Average\" | \"Good\" | \"Excellent\">,
  \"feedback\": <2-3 sentences summarizing performance, clarity, and relevance>,
  \"strengths\": <1-2 sentences highlighting what they answered well>,
  \"improvements\": <1-2 sentences highlighting missing concepts or how to refine the answer>
}";

$userPrompt = "Category: {$category}
Difficulty: {$difficulty}
Question: {$question}

Reference Model Answer:
{$modelAnswer}

Candidate's Answer:
{$userAnswer}

Evaluate the candidate's answer now in the exact JSON format specified.";

// Model to use
$model = GEMINI_MODEL;
$apiKey = GEMINI_API_KEY;

// Call Google Gemini API via cURL
$candidateModels = json_decode(GEMINI_FALLBACK_MODELS, true);
if (!$candidateModels || !is_array($candidateModels)) {
    $candidateModels = [GEMINI_MODEL];
}

$response = null;
$httpCode = 0;
$curlError = '';
$usedModel = '';

foreach ($candidateModels as $model) {
    $endpoint = "https://generativelanguage.googleapis.com/v1beta/models/{$model}:generateContent?key=" . GEMINI_API_KEY;

    $payload = [
        'contents' => [
            [
                'parts' => [
                    ['text' => $systemInstruction . "\n\n" . $userPrompt]
                ]
            ]
        ],
        'generationConfig' => [
            'temperature' => 0.2,
            'maxOutputTokens' => 800
        ]
    ];

    $ch = curl_init($endpoint);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
    curl_setopt($ch, CURLOPT_TIMEOUT, 12);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    curl_close($ch);

    if ($httpCode === 200 && $response) {
        $usedModel = $model;
        break; // Successfully got response!
    }
}

// Fallback evaluator in case of network/quota issues
function fallbackEvaluation($userAnswer, $modelAnswer) {
    $userWords = str_word_count(strtolower($userAnswer), 1);
    $modelWords = array_unique(str_word_count(strtolower($modelAnswer), 1));
    
    $matches = 0;
    foreach ($userWords as $w) {
        if (strlen($w) > 3 && in_array($w, $modelWords)) {
            $matches++;
        }
    }
    
    $ratio = count($modelWords) > 0 ? min(1.0, $matches / (count($modelWords) * 0.4)) : 0.5;
    $score = max(2, min(10, round($ratio * 10)));
    
    $label = 'Average';
    if ($score >= 8) $label = 'Excellent';
    else if ($score >= 6) $label = 'Good';
    else if ($score <= 3) $label = 'Poor';

    return [
        'score' => $score,
        'rating_label' => $label,
        'feedback' => 'Answer submitted and reviewed. Your answer touched on relevant concepts compared with the model response.',
        'strengths' => 'Demonstrated basic familiarity with the question requirements.',
        'improvements' => 'Compare with the model answer to incorporate more specific technical depth and keywords.'
    ];
}

if ($httpCode === 200 && $response) {
    $resData = json_decode($response, true);
    if (isset($resData['candidates'][0]['content']['parts'][0]['text'])) {
        $rawText = trim($resData['candidates'][0]['content']['parts'][0]['text']);
        
        // Strip markdown code fences if Gemini included them (```json ... ```)
        $cleanedText = preg_replace('/^```(?:json)?\s*/i', '', $rawText);
        $cleanedText = preg_replace('/\s*```$/', '', $cleanedText);
        
        $parsedEvaluation = json_decode($cleanedText, true);
        if ($parsedEvaluation && isset($parsedEvaluation['score'])) {
            jsonResponse([
                'success' => true,
                'source' => 'gemini_ai',
                'model' => $usedModel,
                'ai_evaluation' => $parsedEvaluation
            ]);
        }
    }
}

// If Gemini API did not return valid JSON or failed, use smart fallback
$fallback = fallbackEvaluation($userAnswer, $modelAnswer);
jsonResponse([
    'success' => true,
    'source' => 'nlp_fallback',
    'ai_evaluation' => $fallback,
    'debug_note' => $curlError ? "cURL error: $curlError" : "HTTP code: $httpCode"
]);
