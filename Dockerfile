FROM node:16-buster-slim AS deps

WORKDIR /app
COPY package.json yarn.lock ./

RUN yarn install --frozen-lockfile

FROM node:16-buster-slim AS build

ENV NODE_ENV=production
WORKDIR /app
COPY . .
COPY --from=deps /app/node_modules ./node_modules

RUN yarn build

FROM gcr.io/distroless/nodejs
ENV NODE_ENV production
COPY --from=build /app /app
WORKDIR /app
EXPOSE 8080
CMD ["node_modules/.bin/next", "start", "-p", "8080"]
