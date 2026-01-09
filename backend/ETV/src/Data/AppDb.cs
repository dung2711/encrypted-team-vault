using ETV.src.Entities;
using Microsoft.EntityFrameworkCore;

namespace ETV.src.Data
{
    public class AppDb : DbContext
    {
        public AppDb(DbContextOptions<AppDb> options) : base(options)
        {
        }

        public DbSet<User> Users { get; set; }
        public DbSet<Team> Teams { get; set; }
        public DbSet<TeamMember> TeamMembers { get; set; }
        public DbSet<VaultItem> VaultItems { get; set; }
        public DbSet<RefreshToken> RefreshTokens { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // Configure User entity
            modelBuilder.Entity<User>(entity =>
            {
                entity.HasKey(u => u.Id);

                entity.Property(u => u.Id)
                    .HasColumnType("BINARY(16)")
                    .ValueGeneratedNever();

                entity.Property(u => u.Username)
                    .IsRequired()
                    .HasMaxLength(255)
                    .HasColumnType("VARCHAR(255)");

                entity.Property(u => u.Email)
                    .IsRequired()
                    .HasMaxLength(255)
                    .HasColumnType("VARCHAR(255)");

                entity.Property(u => u.Password)
                    .IsRequired()
                    .HasColumnType("LONGTEXT");

                entity.Property(u => u.PublicKey)
                    .IsRequired()
                    .HasColumnType("LONGTEXT");

                entity.Property(u => u.KDFSalt)
                    .IsRequired()
                    .HasColumnType("LONGTEXT");

                entity.Property(u => u.CreatedAt)
                    .HasColumnType("DATETIME(6)")
                    .ValueGeneratedOnAdd();

                // Create unique index on Username and Email
                entity.HasIndex(u => u.Username).IsUnique();
                entity.HasIndex(u => u.Email).IsUnique();
            });

            // Configure Team entity
            modelBuilder.Entity<Team>(entity =>
            {
                entity.HasKey(t => t.TeamId);

                entity.Property(t => t.TeamId)
                    .HasColumnType("BINARY(16)")
                    .ValueGeneratedNever();

                entity.Property(t => t.TeamName)
                    .IsRequired()
                    .HasMaxLength(255)
                    .HasColumnType("VARCHAR(255)");

                entity.Property(t => t.CreatedAt)
                    .HasColumnType("DATETIME(6)")
                    .ValueGeneratedOnAdd();

                // Create index on TeamName
                entity.HasIndex(t => t.TeamName);
            });

            // Configure TeamMember entity
            modelBuilder.Entity<TeamMember>(entity =>
            {
                entity.HasKey(tm => new { tm.TeamId, tm.UserId });

                entity.Property(tm => tm.TeamId)
                    .HasColumnType("BINARY(16)");

                entity.Property(tm => tm.UserId)
                    .HasColumnType("BINARY(16)");

                entity.Property(tm => tm.Role)
                    .HasColumnType("INT")
                    .IsRequired();

                entity.Property(tm => tm.EncryptedTeamKey)
                    .IsRequired()
                    .HasColumnType("LONGTEXT");

                entity.Property(tm => tm.KeyVersion)
                    .IsRequired();

                entity.Property(tm => tm.JoinedAt)
                    .HasColumnType("DATETIME(6)")
                    .ValueGeneratedOnAdd();

                entity.Property(tm => tm.CreatedAt)
                    .HasColumnType("DATETIME(6)")
                    .ValueGeneratedOnAdd();

                // Configure foreign keys
                entity.HasOne(tm => tm.Team)
                    .WithMany(t => t.TeamMembers)
                    .HasForeignKey(tm => tm.TeamId)
                    .OnDelete(DeleteBehavior.Cascade);

                entity.HasOne(tm => tm.User)
                    .WithMany(u => u.TeamMembers)
                    .HasForeignKey(tm => tm.UserId)
                    .OnDelete(DeleteBehavior.Cascade);

                // Create index for TeamId only queries (composite key already covers TeamId + UserId)
                entity.HasIndex(tm => new { tm.TeamId, tm.KeyVersion });
            });

            // Configure VaultItem entity
            modelBuilder.Entity<VaultItem>(entity =>
            {
                entity.HasKey(v => v.Id);

                entity.Property(v => v.Id)
                    .HasColumnType("BINARY(16)")
                    .ValueGeneratedNever();

                entity.Property(v => v.TeamId)
                    .HasColumnType("BINARY(16)")
                    .IsRequired(false);

                entity.Property(v => v.UserId)
                    .HasColumnType("BINARY(16)")
                    .IsRequired(false);

                entity.Property(v => v.EncryptedBlob)
                    .IsRequired()
                    .HasColumnType("LONGTEXT");

                entity.Property(v => v.EncryptedItemKey)
                    .IsRequired()
                    .HasColumnType("LONGTEXT");

                entity.Property(v => v.CreatedAt)
                    .HasColumnType("DATETIME(6)")
                    .ValueGeneratedOnAdd();

                entity.Property(v => v.UpdatedAt)
                    .HasColumnType("DATETIME(6)")
                    .ValueGeneratedOnAddOrUpdate();

                // Configure foreign keys
                entity.HasOne(v => v.Team)
                    .WithMany(t => t.VaultItems)
                    .HasForeignKey(v => v.TeamId)
                    .OnDelete(DeleteBehavior.Cascade)
                    .IsRequired(false);

                entity.HasOne(v => v.User)
                    .WithMany(u => u.VaultItems)
                    .HasForeignKey(v => v.UserId)
                    .OnDelete(DeleteBehavior.Cascade)
                    .IsRequired(false);

                // Add check constraint using ToTable: either TeamId or UserId must be set, but not both
                entity.ToTable(t => t.HasCheckConstraint(
                    "CK_VaultItem_TeamOrUser",
                    "(TeamId IS NOT NULL AND UserId IS NULL) OR (TeamId IS NULL AND UserId IS NOT NULL)"
                ));

                // Create indexes for queries
                entity.HasIndex(v => v.TeamId);
                entity.HasIndex(v => v.UserId);
            });
        }
    }
}
