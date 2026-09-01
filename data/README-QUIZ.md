# Quiz data (parsed from Word)

## Format in Word / source text

Keep this structure when exporting or pasting from Word:

```
Developing Critical Thinking
BSBCRT511

Multiple Choice Questions

Topic 1. Research models of critical and creative thinking

1.	Which model emphasizes six distinct thinking roles represented by metaphorical hats?
a) Bloom's Taxonomy
b) Six Thinking Hats
c) Socratic Method
d) SWOT Analysis
Answer: b) Six Thinking Hats

2.	Bloom's Taxonomy is primarily used for:
...
```

- **Topic N. Title** – start of each topic
- **N. Question text** – question number and text
- **a) … b) … c) … d)** – options (letters a–d)
- **Answer: x) …** – correct letter (a/b/c/d)

## Generate JSON from Word paste

1. Paste your full Word quiz content into `data/quiz-source.txt`.
2. Run:

   ```bash
   node scripts/parse-quiz-from-word.mjs data/quiz-source.txt -o data/quiz-critical-thinking.json
   ```

3. The app can then load `data/quiz-critical-thinking.json` (or fetch it from your CDN).

## Files

- `quiz-source.txt` – paste your Word content here, then run the script.
- `quiz-critical-thinking.json` – parsed output (commit this or host on CDN).
