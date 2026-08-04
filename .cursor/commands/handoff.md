# /handoff — עדכון ידני של מצב המשכיות

בצע עכשיו handoff ידני לסוכן הבא. אל תתחיל פיצ'ר חדש.

1. קרא את מצב Git האמיתי (branch, status, diff רלוונטי, commit אחרון).
2. קרא `.ai/HANDOFF.md` ו-`.ai/ACTIVE_WORK.md` הקיימים.
3. אם היו שינויי קוד רלוונטיים בשיחה הזו שעדיין לא אומתו — הרץ אימות מתאים.
4. אם היו שינויי קוד — הרץ `graphify update .`.
5. עדכן `.ai/HANDOFF.md` עם הסעיפים הבאים בלבד (החלף מידע מיושן, מתחת ל-800 מילים):
   - Goal
   - Current State
   - Active Files
   - Changes Made
   - Failed Attempts
   - Tests and Verification
   - Open Risks and Assumptions
   - Exact Next Steps
   - Git State
6. עדכן `.ai/ACTIVE_WORK.md` עם task / branch / latest commit / status / exact continuation point.
7. עדכן `.ai/PROJECT_STATE.md` רק אם יכולת או מגבלה יציבה השתנתה.
8. עדכן `.ai/DECISIONS.md` רק אם התקבלה החלטה עמידה חדשה.
9. אל תעדכן continuity אם זו הייתה שיחת קריאה בלבד בלי שינוי רלוונטי.
10. אל תכלול סודות, טוקנים, או נתוני ייצור.
11. סיים בסיכום קצר: מה עודכן ומה נקודת ההמשך המדויקת.
