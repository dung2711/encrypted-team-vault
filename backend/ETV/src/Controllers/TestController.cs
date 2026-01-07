using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

[ApiController]
[Route("api/[controller]")]
public class TestController: ControllerBase
{
    [Authorize]
    [HttpGet("test")]
    public IActionResult Test()
    {
        return Ok("Test endpoint is working!");
    }
}