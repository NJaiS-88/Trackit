# ---- Build stage ----
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app

# Resolve dependencies first so they are cached between builds when only sources change
COPY pom.xml .
RUN mvn -B -q dependency:go-offline

COPY src ./src
RUN mvn -B -q -DskipTests package && cp target/*.jar app.jar

# ---- Runtime stage ----
FROM eclipse-temurin:21-jre
WORKDIR /app

RUN useradd --system --uid 10001 --no-create-home trackit
COPY --from=build /app/app.jar app.jar
USER trackit

# Size the heap from the container limit (Render free tier has 512 MB)
ENV JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=75 -XX:+ExitOnOutOfMemoryError"

# Render injects PORT; the app reads it via server.port=${PORT:8081}
EXPOSE 8081
ENTRYPOINT ["java", "-jar", "app.jar"]
