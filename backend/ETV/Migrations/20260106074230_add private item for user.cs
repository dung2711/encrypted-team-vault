using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ETV.Migrations
{
    /// <inheritdoc />
    public partial class addprivateitemforuser : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<byte[]>(
                name: "UserId",
                table: "VaultItems",
                type: "BINARY(16)",
                nullable: false,
                defaultValue: new byte[0]);

            migrationBuilder.CreateIndex(
                name: "IX_VaultItems_UserId",
                table: "VaultItems",
                column: "UserId");

            migrationBuilder.AddForeignKey(
                name: "FK_VaultItems_Users_UserId",
                table: "VaultItems",
                column: "UserId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_VaultItems_Users_UserId",
                table: "VaultItems");

            migrationBuilder.DropIndex(
                name: "IX_VaultItems_UserId",
                table: "VaultItems");

            migrationBuilder.DropColumn(
                name: "UserId",
                table: "VaultItems");
        }
    }
}
