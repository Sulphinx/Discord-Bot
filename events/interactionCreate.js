module.exports = {
  name: 'interactionCreate',
  async execute(interaction, client) {
    if (!interaction.isButton()) return;
    if (interaction.customId == "open-ticket") {
      if (client.guilds.cache.get(interaction.guildId).channels.cache.find(c => c.topic == interaction.user.id)) {
        return interaction.reply({
          content: 'Du har allerede en åben ticket, er dette en fejl så kontakt en administrator!',
          ephemeral: true
        });
      };

      interaction.guild.channels.create(`ticket-${interaction.user.username}`, {
        parent: client.config.parentOpened,
        topic: interaction.user.id,
        permissionOverwrites: [{
            id: interaction.user.id,
            allow: ['SEND_MESSAGES', 'VIEW_CHANNEL'],
          },
          {
            id: client.config.roleSupport,
            allow: ['SEND_MESSAGES', 'VIEW_CHANNEL'],
          },
          {
            id: interaction.guild.roles.everyone,
            deny: ['VIEW_CHANNEL'],
          },
        ],
        type: "GUILD_TEXT",
      }).then(async c => {
        interaction.reply({
          content: `Ticket Oprettet! <#${c.id}>`,
          ephemeral: true
        });

        const embed = new client.discord.MessageEmbed()
          .setColor('6d6ee8')
          .setAuthor({name: `${interaction.user.username}'s Ticket`, iconURL: 'https://i.imgur.com/ZOynpme.png'})
          .setDescription('Vælg kategorien som passer til din ticket.')
          .setTimestamp();

        const row = new client.discord.MessageActionRow()
          .addComponents(
            new client.discord.MessageSelectMenu()
            .setCustomId('category')
            .setPlaceholder('Vælg kategorien som passer til din ticket')
            .addOptions([{
                label: client.config.Category1,
                value: client.config.Category1,
                emoji: '💸',
              },
              {
                label: client.config.Category2,
                value: client.config.Category2,
                emoji: '⚠',
              },
              {
                label: client.config.Category3,
                value: client.config.Category3,
                emoji: '🤖',
              },
            ]),
          );

        msg = await c.send({
          content: `<@!${interaction.user.id}>`,
          embeds: [embed],
          components: [row]
        });

        const collector = msg.createMessageComponentCollector({
          componentType: 'SELECT_MENU',
          time: 20000 //20 seconds
        });

        collector.on('collect', async i => {
          if (i.user.id === interaction.user.id) {
            if (msg.deletable) {
              msg.delete().then(async () => {
                const chosenCategory = i.values[0];
                let categoryId;
          
                // Find den ID for den valgte kategori
                switch (chosenCategory) {
                  case client.config.Category1:
                    categoryId = client.config.Category1ID;
                    break;
                  case client.config.Category2:
                    categoryId = client.config.Category2ID;
                    break;
                  case client.config.Category3:
                    categoryId = client.config.Category3ID;
                    break;
                  default:
                    categoryId = null;
                }
          
                if (!categoryId) {
                  return console.error("Ugyldig kategori valgt.");
                }
        
                // Find den åbne ticket-kanal for brugeren
                const ticketChannel = client.guilds.cache.get(interaction.guildId).channels.cache.find(c => c.type === 'GUILD_TEXT' && c.name.startsWith('ticket-') && c.topic === interaction.user.id);
                if (!ticketChannel) {
                  return console.error("Kunne ikke finde brugerens ticket-kanal.");
                }
                const embed = new client.discord.MessageEmbed()
                .setColor('6d6ee8')
                .setAuthor({name: 'Ticket', iconURL: interaction.user.displayAvatarURL()})
                .setDescription(`<@!${interaction.user.id}> Oprettede en ticket angående \`${i.values[0]}\``)
                .setTimestamp();

                const row = new client.discord.MessageActionRow()
                  .addComponents(
                    new client.discord.MessageButton()
                    .setCustomId('close-ticket')
                    .setLabel('Luk Ticket')
                    .setEmoji('✖')
                    .setStyle('DANGER'),
                  );

                const opened = await c.send({
                  content: `<@&${client.config.roleSupport}>`,
                  embeds: [embed],
                  components: [row]
                });

                opened.pin().then(() => {
                  opened.channel.bulkDelete(1);
                });
        
                // Flyt den gamle kanal til den valgte kategori
                ticketChannel.setParent(categoryId)
                  .then(updatedChannel => {
                    console.log(`Den gamle kanal blev flyttet til kategori ${updatedChannel.parent.name}.`);
                    // Opdater tilladelserne for den gamle kanal
                    updatedChannel.permissionOverwrites.edit(interaction.user.id, {
                      SEND_MESSAGES: true,
                      VIEW_CHANNEL: true
                    });
                  })
                  .catch(error => {
                    console.error('Fejl ved flytning af den gamle kanal:', error.message);
                  });
              });
            }
          }
        });        

        collector.on('end', collected => {
          if (collected.size < 1) {
            c.send(`Ingen kategori valgt, lukker ticketen..`).then(() => {
              setTimeout(() => {
                if (c.deletable) {
                  c.delete();
                };
              }, 5000);
            });
          };
        });
      });
    };

    if (interaction.customId == "close-ticket") {
      const guild = client.guilds.cache.get(interaction.guildId);
      const chan = guild.channels.cache.get(interaction.channelId);

      const row = new client.discord.MessageActionRow()
        .addComponents(
          new client.discord.MessageButton()
          .setCustomId('confirm-close')
          .setLabel('Close')
          .setStyle('DANGER'),
          new client.discord.MessageButton()
          .setCustomId('no')
          .setLabel('Cancel')
          .setStyle('SECONDARY'),
        );

      const verif = await interaction.reply({
        content: 'Er du sikker på at du vil lukke ticketen?',
        components: [row]
      });

      const collector = interaction.channel.createMessageComponentCollector({
        componentType: 'BUTTON',
        time: 10000
      });

      collector.on('collect', i => {
        if (i.customId == 'confirm-close') {
          interaction.editReply({
            content: `Ticket lukket af <@!${interaction.user.id}>`,
            components: []
          });

          chan.edit({
              name: `closed-${chan.name}`,
              permissionOverwrites: [
                {
                  id: client.users.cache.get(chan.topic),
                  deny: ['SEND_MESSAGES', 'VIEW_CHANNEL'],
                },
                {
                  id: client.config.roleSupport,
                  allow: ['SEND_MESSAGES', 'VIEW_CHANNEL'],
                },
                {
                  id: interaction.guild.roles.everyone,
                  deny: ['VIEW_CHANNEL'],
                },
              ],
            })
            .then(async () => {
              const embed = new client.discord.MessageEmbed()
                .setColor('6d6ee8')
                .setAuthor({name: 'Ticket', iconURL: 'https://i.imgur.com/ZOynpme.png'})
                .setDescription('```Ticket Opsummering```')
                .setTimestamp();

              const row = new client.discord.MessageActionRow()
                .addComponents(
                  new client.discord.MessageButton()
                  .setCustomId('delete-ticket')
                  .setLabel('Slet Kanal')
                  .setEmoji('🗑️')
                  .setStyle('DANGER'),
                );

              chan.send({
                embeds: [embed],
                components: [row]
              });
            });

          collector.stop();
        };
        if (i.customId == 'no') {
          interaction.editReply({
            content: 'Annuller!',
            components: []
          });
          collector.stop();
        };
      });

      collector.on('end', (i) => {
        if (i.size < 1) {
          interaction.editReply({
            content: 'Annuller!',
            components: []
          });
        };
      });
    };

    if (interaction.customId == "delete-ticket") {
      const guild = client.guilds.cache.get(interaction.guildId);
      const chan = guild.channels.cache.get(interaction.channelId);

      interaction.reply({
        content: 'Sletter ticket..'
      });

      const embed = new client.discord.MessageEmbed()
        .setAuthor({name: 'Ticket Logs', iconURL: 'https://i.imgur.com/ZOynpme.png'})
        .setDescription(`📰 Logs for ticketen \`${chan.id}\` | Oprettet af <@!${chan.topic}> | Lukket af <@!${interaction.user.id}>\n\nLogs: [**Grundet GDPR er dette ikke muligt.**]`)
        .setColor('2f3136')
        .setTimestamp();

      const embed2 = new client.discord.MessageEmbed()
        .setAuthor({name: 'Ticket Logs', iconURL: 'https://i.imgur.com/ZOynpme.png'})
        .setDescription(`📰 Logs for ticketen \`${chan.id}\`: [**Grundet GDPR er dette ikke muligt.**]`)
        .setColor('2f3136')
        .setTimestamp();

      client.channels.cache.get(client.config.logsTicket).send({
        embeds: [embed]
      }).catch(() => console.log("Ticket log kanal blev ikke fundet."));
      chan.send('Sletter kanal...');

      setTimeout(() => {
        chan.delete();
      }, 5000);
    };
  },
};
