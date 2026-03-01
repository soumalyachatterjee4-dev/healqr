# healQR BrainDeck Requirements

The following features and logic will be implemented for the healQR BrainDeck quiz functionality in the next development phase:

## 1. Question Selection and Rotation
- **Question Count:** Randomly select exactly **10 questions** per set from the main question pool.
- **Cooldown Period:** Ensure that the same question is **not reused within 7 days** for a given user.

## 2. Difficulty Sets and Distribution
- **Total Sets:** **5 Sets** of mixed questions available per day.
- **Difficulty Breakdown:**
  - Easy: 1 set
  - Medium: 3 sets
  - Hard: 1 set
- **Progression Logic:** A minimum score of **90% is required to unlock** the next set/difficulty step.

## 3. Question Categories
The question pool must include questions from the following varied subjects:
- History
- Geography
- General Science
- Sports
- Indian Mythology

---
*Note: This document serves as the blueprint for the upcoming BrainDeck logic improvements. We will iterate on the existing `BrainDeckManager.tsx` to fully implement these rules when work resumes.*
