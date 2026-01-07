using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ETV.Migrations
{
    /// <inheritdoc />
    public partial class supportpersonalvaultitems : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<byte[]>(
                name: "UserId",
                table: "VaultItems",
                type: "BINARY(16)",
                nullable: true,
                oldClrType: typeof(byte[]),
                oldType: "BINARY(16)");

            migrationBuilder.AlterColumn<byte[]>(
                name: "TeamId",
                table: "VaultItems",
                type: "BINARY(16)",
                nullable: true,
                oldClrType: typeof(byte[]),
                oldType: "BINARY(16)");

            migrationBuilder.AddCheckConstraint(
                name: "CK_VaultItem_TeamOrUser",
                table: "VaultItems",
                sql: "(TeamId IS NOT NULL AND UserId IS NULL) OR (TeamId IS NULL AND UserId IS NOT NULL)");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "CK_VaultItem_TeamOrUser",
                table: "VaultItems");

            migrationBuilder.AlterColumn<byte[]>(
                name: "UserId",
                table: "VaultItems",
                type: "BINARY(16)",
                nullable: false,
                defaultValue: new byte[0],
                oldClrType: typeof(byte[]),
                oldType: "BINARY(16)",
                oldNullable: true);

            migrationBuilder.AlterColumn<byte[]>(
                name: "TeamId",
                table: "VaultItems",
                type: "BINARY(16)",
                nullable: false,
                defaultValue: new byte[0],
                oldClrType: typeof(byte[]),
                oldType: "BINARY(16)",
                oldNullable: true);
        }
    }
}
