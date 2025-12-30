using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using ETV.src.Middlewares;
using ETV.src.Data;
using ETV.src.Services;
using ETV.src.Extensions;
using dotenv.net;
using ETV.Services;
using Microsoft.EntityFrameworkCore;
using Serilog;

var builder = WebApplication.CreateBuilder(args);
DotEnv.Load();
var config = builder.Configuration.AddEnvironmentVariables().Build();

// Add services to the container.
var jwtSettings = config.GetSection("JWT");
Console.WriteLine("JWT Settings: " + jwtSettings["SECRET_KEY"]);
var secretKey = jwtSettings["SECRET_KEY"] ?? throw new InvalidOperationException("JWT SecretKey is not configured");
var key = Encoding.ASCII.GetBytes(secretKey);

// Get connection string - use DATABASE_CONNECTION_STRING if set (container),
// otherwise replace mysql with localhost for host machine
var connectionString = config["DATABASE_CONNECTION_STRING"];
if (string.IsNullOrEmpty(connectionString))
{
    throw new InvalidOperationException("DATABASE_CONNECTION_STRING is not configured in environment");
}
var isRunningInContainer = bool.TryParse(config["DOTNET_RUNNING_IN_CONTAINER"], out var result) && result;
if (!isRunningInContainer)
{
    connectionString = connectionString.Replace("Server=mysql", "Server=localhost", StringComparison.OrdinalIgnoreCase);
}

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(key),
        ValidateIssuer = true,
        ValidIssuer = jwtSettings["ISSUER"],
        ValidateAudience = true,
        ValidAudience = jwtSettings["AUDIENCE"],
        ValidateLifetime = true,
        ClockSkew = TimeSpan.Zero
    };
});

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

builder.Services.AddControllers();
// Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGenWithAuth();
builder.Services.AddHttpContextAccessor();
// Configure Serilog
builder.Host.UseSerilog((context, loggerConfig) =>
    loggerConfig.ReadFrom.Configuration(context.Configuration)
);

// Configure DbContext with MySQL
builder.Services.AddDbContext<AppDb>((serviceProvider, options) =>
{
    options.UseMySql(
        connectionString,
        ServerVersion.AutoDetect(connectionString)
    );
    // Enable detailed logging for development
    if (builder.Environment.IsDevelopment())
    {
        options
            .EnableSensitiveDataLogging()
            .EnableDetailedErrors();
    }
});

// Add Services
builder.Services.AddScoped<TokenProvider>();
builder.Services.AddScoped<UserService>();
builder.Services.AddScoped<TeamService>();
builder.Services.AddScoped<ItemService>();

var app = builder.Build();

// Configure the HTTP request pipeline.
// Enable Swagger UI for both Development and Production
app.UseSwagger();
app.UseSwaggerUI();

app.UseHttpsRedirection();

// Enable CORS
app.UseCors("AllowAll");

// Add exception handling middleware
app.UseMiddleware<ExceptionHandlingMiddleware>();

// Add authentication and authorization middleware
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
app.UseSerilogRequestLogging();
app.Run();