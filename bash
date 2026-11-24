mkdir grochr && cd grochr && mkdir -p server/services client/src/components
# paste files above into the matching paths, then:

cd server && npm install && npm run seed && npm run dev &
cd ../client && npm install && npm run dev
