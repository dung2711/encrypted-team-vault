# Build Stage
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Copy project files
COPY ["ETV.csproj", "."]

# Restore dependencies
RUN dotnet restore "ETV.csproj"

# Copy source code
COPY . .

# Build the application
RUN dotnet build "ETV.csproj" -c Release -o /app/build

# Publish Stage
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app

# Copy published application from build stage
COPY --from=build /app/build .
COPY .env .env
# Expose port
EXPOSE 8080

# Health check endpoint
HEALTHCHECK --interval=10s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8080/health || exit 1

# Run the application
ENTRYPOINT ["dotnet", "ETV.dll"]
