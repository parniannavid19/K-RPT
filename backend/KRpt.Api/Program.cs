using System.Text;
using KRpt.Api.Hubs;
using KRpt.Infrastructure.Data;
using KRpt.Infrastructure.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;

var builder = WebApplication.CreateBuilder(args);

// ۱. تنظیمات اتصال دیتابیس با پشتیبانی رسمی HierarchyId
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(connectionString, x => x.UseHierarchyId()));

// ۲. تزریق وابستگی سرویس‌ها
builder.Services.AddScoped<IJwtService, JwtService>();
builder.Services.AddScoped<IReportLockService, ReportLockService>();
builder.Services.AddScoped<IPermissionLockService, PermissionLockService>();

// ۳. پشتیبانی از SignalR برای قفل‌گذاری هم‌زمان
builder.Services.AddSignalR();

// ۴. تنظیمات احراز هویت با JWT
var jwtKey = builder.Configuration["Jwt:Key"] ?? "KRptEnterpriseReportSystemSecretKey2026SuperSecure!";
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"] ?? "KRptApi",
            ValidAudience = builder.Configuration["Jwt:Audience"] ?? "KRptClient",
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey))
        };
        // خواندن توکن از query string برای ارتباطات SignalR
        options.Events = new JwtBearerEvents
        {
            OnMessageReceived = context =>
            {
                var accessToken = context.Request.Query["access_token"];
                var path = context.HttpContext.Request.Path;
                if (!string.IsNullOrEmpty(accessToken) && path.StartsWithSegments("/hubs"))
                {
                    context.Token = accessToken;
                }
                return Task.CompletedTask;
            }
        };
    });

builder.Services.AddAuthorization();

// ۵. سیاست CORS برای ارتباط روان فرانت‌اند
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.SetIsOriginAllowed(_ => true)
              .AllowAnyMethod()
              .AllowAnyHeader()
              .AllowCredentials();
    });
});

// ۶. تنظیمات کنترلرها
builder.Services.AddControllers();

// ۷. تنظیمات Swagger به همراه پشتیبانی از Bearer Token
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "سامانه کاتالوگ و تبارشناسی گزارش‌ها (K-RPT API)",
        Version = "v1",
        Description = "سرویس‌های مدیریت گزارش‌ها، قفل‌گذاری هم‌زمان، بانک فیلدها و موتور مقایسه"
    });

    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Description = "لطفاً توکن JWT را با پیشوند Bearer وارد نمایید (مثال: 'Bearer eyJhbGci...')",
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.ApiKey,
        Scheme = "Bearer"
    });

    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});

var app = builder.Build();

// خط لوله درخواست‌ها (HTTP Pipeline)
app.UseCors("AllowAll");

app.UseSwagger();
app.UseSwaggerUI(c =>
{
    c.SwaggerEndpoint("/swagger/v1/swagger.json", "K-RPT API v1");
    c.RoutePrefix = "swagger";
});

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
app.MapHub<ReportLockHub>("/hubs/lock");

app.Run();
