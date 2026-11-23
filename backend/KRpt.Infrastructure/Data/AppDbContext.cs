using KRpt.Core.Entities;
using Microsoft.EntityFrameworkCore;

namespace KRpt.Infrastructure.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    public DbSet<Role> Roles => Set<Role>();
    public DbSet<User> Users => Set<User>();
    public DbSet<ReportTreeNode> ReportTreeNodes => Set<ReportTreeNode>();
    public DbSet<Report> Reports => Set<Report>();
    public DbSet<FieldBank> FieldBank => Set<FieldBank>();
    public DbSet<ParameterBank> ParameterBank => Set<ParameterBank>();
    public DbSet<ReportField> ReportFields => Set<ReportField>();
    public DbSet<ReportParameter> ReportParameters => Set<ReportParameter>();
    public DbSet<Tag> Tags => Set<Tag>();
    public DbSet<ReportTag> ReportTags => Set<ReportTag>();
    public DbSet<ReportRelation> ReportRelations => Set<ReportRelation>();
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();
    public DbSet<PermissionTreeNode> PermissionTreeNodes => Set<PermissionTreeNode>();
    public DbSet<PermissionItem> Permissions => Set<PermissionItem>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Composite Key for ReportTags
        modelBuilder.Entity<ReportTag>()
            .HasKey(rt => new { rt.ReportId, rt.TagId });

        modelBuilder.Entity<ReportTag>()
            .HasOne(rt => rt.Report)
            .WithMany(r => r.ReportTags)
            .HasForeignKey(rt => rt.ReportId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<ReportTag>()
            .HasOne(rt => rt.Tag)
            .WithMany(t => t.ReportTags)
            .HasForeignKey(rt => rt.TagId)
            .OnDelete(DeleteBehavior.Cascade);

        // Unique Constraint on ReportFields (ReportId, FieldId)
        modelBuilder.Entity<ReportField>()
            .HasIndex(rf => new { rf.ReportId, rf.FieldId })
            .IsUnique();

        modelBuilder.Entity<ReportField>()
            .HasOne(rf => rf.Report)
            .WithMany(r => r.ReportFields)
            .HasForeignKey(rf => rf.ReportId)
            .OnDelete(DeleteBehavior.Cascade);

        // Relations: Restrict delete to avoid multiple cascade paths in SQL Server
        modelBuilder.Entity<ReportRelation>()
            .HasOne(rr => rr.SourceReport)
            .WithMany(r => r.SourceRelations)
            .HasForeignKey(rr => rr.SourceReportId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<ReportRelation>()
            .HasOne(rr => rr.TargetReport)
            .WithMany(r => r.TargetRelations)
            .HasForeignKey(rr => rr.TargetReportId)
            .OnDelete(DeleteBehavior.Restrict);

        // Tree node recursive relationship
        modelBuilder.Entity<ReportTreeNode>()
            .HasOne(n => n.ParentNode)
            .WithMany(n => n.Children)
            .HasForeignKey(n => n.ParentNodeId)
            .OnDelete(DeleteBehavior.Restrict);

        // One-to-one between Report and ReportTreeNode
        modelBuilder.Entity<Report>()
            .HasOne(r => r.Node)
            .WithOne(n => n.Report)
            .HasForeignKey<Report>(r => r.NodeId)
            .OnDelete(DeleteBehavior.Cascade);

        // Permission tree node recursive relationship
        modelBuilder.Entity<PermissionTreeNode>()
            .HasOne(n => n.ParentNode)
            .WithMany(n => n.Children)
            .HasForeignKey(n => n.ParentNodeId)
            .OnDelete(DeleteBehavior.Restrict);

        // One-to-many between PermissionTreeNode and PermissionItem
        modelBuilder.Entity<PermissionItem>()
            .HasOne(p => p.Node)
            .WithMany(n => n.Permissions)
            .HasForeignKey(p => p.NodeId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
