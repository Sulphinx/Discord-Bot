const {
  SlashCommandBuilder
} = require('@discordjs/builders');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('plexmarkedbot')
    .setDescription('Kredit til udvikleren.'),
  async execute(interaction, client) {
    const embed = new client.discord.MessageEmbed()
      .setColor('6d6ee8')
      .setDescription('Udviklet med Kærlighed af Sulphinx\n\n[`Github`](https://github.com/Sulphinx) | [`Twitch`](https://www.twitch.tv/sulphinx) | [`Discord`](https://discord.gg/bHfynCk8gc)')
      .setFooter(client.user.tag, client.user.avatarURL())
      .setTimestamp();
    await interaction.reply({
      embeds: [embed]
    });
  },
};