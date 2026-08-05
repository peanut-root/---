# CSV Data Dictionary

This file explains the exported CSV columns used by the formal experiment and demo backend.

## Unit And Coding Rules

- One CSV row equals one trial for one participant.
- `participant_label` is the easy-to-read anonymous participant label, such as `P001`, `P002`, etc.
- `participant_number_assigned_by_server` identifies the first, second, third participant, etc.
- Reaction time fields ending in `_rt_ms` are measured in milliseconds.
- Accuracy fields use `1 = correct`, `0 = incorrect`.
- Likert-style ratings are always `1-5`. There is no `0` option.
- `reading_page_time_ms` measures only the time spent on the initial passage reading page.

## Core Trial Fields

| Column | Meaning |
| --- | --- |
| `participant_label` | Anonymous display label for each participant, such as `P001`. |
| `participant_number_assigned_by_server` | Numeric server-assigned participant order; `1` means the first completed formal participant. |
| `anonymous_participant_id` | Anonymous browser-generated submission ID used for duplicate prevention. |
| `submission_id` | Backend submission ID; normally the same anonymous client ID. |
| `actual_text_type` | True text source condition, such as `Human-written`, `AI-generated`, or `Human-AI hybrid`. |
| `participant_authorship_judgment` | Participant's authorship judgment response. |
| `text_condition_code` | Short condition code, such as `Human`, `AI`, or `Hybrid`. |
| `text_id` | Stimulus ID shown in this trial. |
| `text_pair_id` | Matched-pair identifier; all three variants from the same base passage share this ID. |
| `text_base_id` | Original human base passage ID, such as `H001`. |
| `text_generation_model` | Model used for AI/Hybrid generation; blank for Human-written passages. |
| `text_generation_temperature` | Temperature used for AI/Hybrid generation; blank for Human-written passages. |
| `text_generation_prompt_version` | Structured prompt version used for AI/Hybrid generation. |
| `text_generation_api_base_url` | OpenAI-compatible API base URL used by the backend generator. |
| `trial_number_within_participant` | Trial order for that participant. |
| `total_trials_assigned_to_participant` | Total randomized trials assigned to that participant. |
| `reading_page_time_ms` | Time from passage display to the participant clicking finished reading. |

## Background Questionnaire

| Column | Meaning |
| --- | --- |
| `background_education_level` | Participant's selected education level. |
| `background_english_learning_years` | Participant's selected English learning duration range. |
| `background_english_reading_proficiency_1to5` | Self-rated English reading proficiency, 1-5 only. |
| `background_chinese_proficiency_1to5` | Self-rated Chinese proficiency, 1-5 only. |
| `background_english_reading_frequency` | Self-reported English reading frequency. |
| `background_ai_tool_use_frequency` | Self-reported AI tool use frequency. |
| `background_ai_writing_familiarity_1to5` | Familiarity with AI-generated writing, 1-5 only. |

## Authorship Judgment

| Column | Meaning |
| --- | --- |
| `authorship_response_key` | Keyboard key used for authorship judgment. |
| `authorship_rt_ms` | RT from authorship question display to key press. |
| `authorship_accuracy` | Whether the judgment matched the true text type. |
| `ai_likelihood_rating_1to5` | Participant's AI-likelihood rating, 1-5 only. |

## Linguistic Cue Ratings

All cue ratings are 1-5 only:

- `fluency_rating_1to5`
- `structure_rating_1to5`
- `clarity_rating_1to5`
- `emotion_rating_1to5`
- `personal_voice_rating_1to5`
- `genericness_rating_1to5`
- `naturalness_rating_1to5`

## Filler Task

| Column | Meaning |
| --- | --- |
| `filler_task_type` | Filler task type, such as odd/even or vowel/consonant. |
| `filler_prompt` | Prompt shown to the participant. |
| `filler_answer` | Participant's answer. |
| `filler_response_key` | Keyboard key used. |
| `filler_accuracy` | Whether the filler response was correct. |
| `filler_rt_ms` | RT from filler prompt display to key press. |

## Memory Tasks

| Column | Meaning |
| --- | --- |
| `recognition_test_sentence` | Sentence used in the recognition task. |
| `recognition_answer` | Participant's Yes/No answer. |
| `recognition_response_key` | Keyboard key used, usually F/J. |
| `recognition_accuracy` | Whether recognition answer was correct. |
| `recognition_rt_ms` | RT from recognition question display to key press. |
| `reconstruction_available_words` | Scrambled words shown as options. |
| `reconstruction_selected_words_response` | Participant's selected word order. |
| `reconstruction_accuracy` | Whether selected word order matched the correct order. |
| `reconstruction_rt_ms` | RT from reconstruction activation to Enter submission. |
