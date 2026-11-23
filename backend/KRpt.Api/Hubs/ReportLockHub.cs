using Microsoft.AspNetCore.SignalR;

namespace KRpt.Api.Hubs;

public class ReportLockHub : Hub
{
    public async Task JoinReport(int reportId)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, $"report-{reportId}");
    }

    public async Task LeaveReport(int reportId)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"report-{reportId}");
    }

    public async Task JoinPermission(int permissionId)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, $"permission-{permissionId}");
    }

    public async Task LeavePermission(int permissionId)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"permission-{permissionId}");
    }
}
