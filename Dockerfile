## stage one, compile temperory image
FROM node:16.13.2-slim
WORKDIR /usr
COPY package.json ./
COPY tsconfig.json ./
COPY src ./src
RUN ls -a
RUN npm install
RUN npm run build

## this is stage two, where the app actually runs
FROM node:16.13.2-slim
WORKDIR /usr
COPY package.json ./
RUN npm install --only=production
COPY --from=0 /usr/dist .
RUN npm install pm2 -g
CMD ["pm2-runtime", "app.js"]