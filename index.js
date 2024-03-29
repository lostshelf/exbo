const express = require('express');
const app = express();
const port = 3000;

app.get('/', (req, res) => res.send('why are you here and how did you find this? Anyways, that\'s besides the point, have you joined our official Discord server? You haven\'t? Well that\'s no good! Here is the link: https://discord.gg/U6eePgu and we can\'t forget about the bot, now can we? Here is the invite link for the bot: https://discord.com/oauth2/authorize?client_id=759836239791915028&scope=bot&permissions=8 Enjoy your stay!'));

app.listen(port, () => console.log(`ExBo's website is up on port ${port}`));

// Discord Bot Starts Now!
const fs = require('fs');
const Discord = require('discord.js');
const Sequelize = require('sequelize');
const { prefix, version, embedColor } = require('./config.json');
// eslint-disable-next-line no-unused-vars
const pathToFfmpeg = require('ffmpeg-static');

const client = new Discord.Client();

// eslint-disable-next-line no-unused-vars
const { Users, CurrencyShop } = require('./dbObjects');
// eslint-disable-next-line no-unused-vars
const { Op } = require('sequelize');
const currency = new Discord.Collection();

Reflect.defineProperty(currency, 'add', {
	/* eslint-disable-next-line func-name-matching */
	value: async function add(id, amount) {
		const user = currency.get(id);
		if (user) {
			user.balance += Number(amount);
			return user.save();
		}
		const newUser = await Users.create({ user_id: id, balance: amount });
		currency.set(id, newUser);
		return newUser;
	},
});

Reflect.defineProperty(currency, 'getBalance', {
	/* eslint-disable-next-line func-name-matching */
	value: function getBalance(id) {
		const user = currency.get(id);
		return user ? user.balance : 0;
	},
});

client.commands = new Discord.Collection();

const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
	const command = require(`./commands/${file}`);
	client.commands.set(command.name, command);
}

const cooldowns = new Discord.Collection();

const sequelize = new Sequelize('database', 'user', 'password', {
	host: 'localhost',
	dialect: 'sqlite',
	logging: false,
	storage: 'database.sqlite',
});

const Tags = sequelize.define('tags', {
	name: {
		type: Sequelize.STRING,
		unique: true,
	},
	description: Sequelize.TEXT,
	username: Sequelize.STRING,
	usage_count: {
		type: Sequelize.INTEGER,
		defaultValue: 0,
		allowNull: false,
	},
});

const date = Date.now();
const time = new Date(date);

client.once('ready', async () => {
	console.log(`ExBo is now up!`);
	await Tags.sync();
	await client.user.setActivity(`No longer under developement`, { type: 'PLAYING' });
	const storedBalances = await Users.findAll();
	storedBalances.forEach(b => currency.set(b.user_id, b));
});

client.on('guildCreate', async guild => {
	console.log(`Added to the following server: ${guild.name}, which has ${guild.memberCount}`);
});

client.on('guildMemberAdd', async member => {
	console.log(`${member.user.tag} has joined the server at ${time}`);
	const role = member.guild.roles.cache.find(x => x.name === 'ExInUs');
	member.roles.add(role)
		.then(console.log(`${member.user.tag} now has ${role} role.`))
		.catch(console.error);
});

client.on('message', async message => {
	currency.add(message.author.id, 1);

	const embed = new Discord.MessageEmbed().setColor(embedColor);
	const oop = [
		'object oriented programming',
		'oop',
	];

	if (message.content.toLowerCase() === oop[1] && message.content.toLowerCase() === oop[2]) {
		await message.channel.send('sksksksksksksksksk');
	}
	if (message.content.toLowerCase() === 'thx') return message.channel.send('ur welcome bb');
	if (message.author.id === '632690114082111519') return message.channel.send('no');

	if (!message.content.startsWith(prefix) || message.author.bot) return;
	const args = message.content.slice(prefix.length).trim().split(/ +/);
	const commandName = args.shift().toLowerCase();

	const command = client.commands.get(commandName)
		|| client.commands.find(cmd => cmd.aliases && cmd.aliases.includes(commandName));

	/* const getUserFromMention = (mention) => {
		const matches = mention.match(/^<@!?(\d+)>$/);
		if (!matches) return;
		const id = matches[1];
		return client.users.cache.get(id);
	}; */

	// eslint-disable-next-line no-unused-vars
	// const user = getUserFromMention(args[0]);

	if (!command) {
		embed
			.setTitle('__Command or Alias Not Found__')
			.setDescription(`\`Check if there is a spelling error and retry the command.\``)
			.setFooter('Run `>help` if you want to get a list of commands.');

		return await message.channel.send(embed) && console.error();
	}

	if (command.guildOnly && command.guildOnly === true && message.channel.type === 'dm') {
		return message.reply('That command is not executable in DMs');
	}

	if (!message.author.id === '332555969169063938' && command.permissions && !message.member.hasPermission(command.permissions)) {
		embed
			.setTitle('__Insufficient Permissions__')
			.setDescription(`\`You don't have the permissions to run this command.\``);

		return message.channel.send(embed);
	}

	if (command.minArgs && !args.length === command.minArgs) {
		embed
			.setTitle('__Missing Arguments__')
			.setDescription(`\`A minimum of at least ${command.minArgs} argument(s) are required.\``);

		if (command.usage) embed.addField('__Usage__', `\`${command.usage}\``);

		return message.channel.send(embed);
	}

	if (!cooldowns.has(command.name)) cooldowns.set(command.name, new Discord.Collection());

	const now = Date.now();
	const timestamps = cooldowns.get(command.name);
	const cooldownAmount = (command.cooldown || 3) * 1000;

	if (timestamps.has(message.author.id)) {
		const expirationTime = timestamps.get(message.author.id) + cooldownAmount;

		if (message.member.hasPermission('MANAGE_MESSAGES')) {
			try {
				command.execute(message, args);
			}
			catch (error) {
				console.error(error);
				await message.channel.send('An unexpected error has occurred.');
			}
			return;
		}

		if (now < expirationTime) {
			const timeLeft = (expirationTime - now) / 1000;
			return message.reply(`You still have ${timeLeft.toFixed(1)} second(s) left until the cool down expires`);
		}
	}

	timestamps.set(message.author.id, now);
	setTimeout(() => timestamps.delete(message.author.id), cooldownAmount);

	if (command.selfExecute && command.selfExecute === true) {
		if (command.selfExecute === false) {
			embed.setDescription('You can\'t run this command on yourself');

			return message.channel.send(embed);
		}
	}

	if (command.requireId && command.requireId === true) {
		embed
			.setTitle('__Invalid Argument__')
			.setDescription('`IDs are required for this command.`');

		return message.channel.send(embed);
	}

	if (command.requireMention && command.requireMention === true && !message.mentions.users.first()) {
		embed
			.setTitle('__Invalid Argument__')
			.setDescription('`You need to mention a user in the server.`');

		if (command.usage) embed.addField('__Usage__', `\`${command.usage}\``);
		return message.channel.send(embed);
	}

	if (command.wip && command.wip === true) {
		embed
			.setTitle('__Command Unavailable__')
			.setDescription('`This command isn\'t functional at the moment, please be patient.`');
	}

	try {
		embed
			.setTitle('__Error Executing Command__')
			.setDescription(`An error has caused the command to fail execution. We will look into this momentarily`);

		command.execute(message, args, Users, currency);

		console.log(`${message.member.user.tag} has executed '${prefix}${command.name}' with the following arguments: '${args.join(' ')}' at ${time} in ${message.guild.name}`);
	}
	catch (error) {
		embed
			.setTitle('__Error Executing Command__')
			.setDescription(`\`An error has caused the command to fail execution. We will look into this momentarily\``);

		console.error(error);
		embed.addFields(
			{ name: '__Error Message__', value: `\`${error}\`` },
			{ name: '__Troubleshooting__', value: '`Try reloading the command. If that doesn\'t work, report the issue in <!#759847171930849282>`' },
		);

		await message.channel.send(embed);
	}
});

client.login(process.env.DISCORD_TOKEN).then(console.log('ExBo is now logged into Discord.'));