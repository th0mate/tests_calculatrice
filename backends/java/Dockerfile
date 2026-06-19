FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /app
COPY pom.xml .
COPY src ./src
RUN mvn -B -q package

FROM eclipse-temurin:17
WORKDIR /app
COPY --from=build /app/target/classes ./classes

ENV PORT=3002
EXPOSE 3002
CMD ["sh", "-c", "java -cp classes com.aurora.calc.Server"]
