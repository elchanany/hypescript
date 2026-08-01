"""מפעיל את הממשק הגרפי של hypescript ללא חלון טרמינל.

לחיצה כפולה על הקובץ הזה תפתח את הממשק (בתנאי ש-Python מותקן ומשויך ל-.pyw).
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from hypescript.gui import main  # noqa: E402

if __name__ == "__main__":
    main()
