FROM node:20-bookworm-slim
# fonts-noto-core מביא את Noto Sans Hebrew, ו-fontconfig נדרש כדי ש-libass
# ימצא אותו לפי שם. בלעדיהם צריבת כתוביות בעברית מייצרת ריבועים במקום אותיות —
# ייצוא שנראה "הצליח" ומחזיר וידאו לא שמיש.
RUN apt-get update && apt-get install -y --no-install-recommends       ffmpeg ca-certificates fontconfig fonts-noto-core fonts-noto-color-emoji     && fc-cache -f     && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY server.mjs ./
ENV NODE_ENV=production PORT=8080
USER node
CMD ["npm", "start"]
