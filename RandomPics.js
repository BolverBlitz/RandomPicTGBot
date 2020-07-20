//Include needed jsons
var config = require('./config');
var package = require('./package')
var secret = require('./secret');

const f = require('./src/Funktions');
const OS = require('./src/Hardware');

const ping = require('ping');
const request = require("request");
const fs = require('fs');

const Telebot = require('telebot');
const { kMaxLength } = require('buffer');
const bot = new Telebot({
	token: secret.bottoken,
	limit: 1000,
        usePlugins: ['commandButton']
});

var Time_started = new Date().getTime();
var CatLimit = 0;
var CatArray = [];
var MaxLength = 6; //Array Länge

bot.start(); //Telegram bot start

//Telegram Errors
bot.on('reconnecting', (reconnecting) => {
	f.log("Lost connection");
	var LastConnectionLost = new Date();
});
bot.on('reconnected', (reconnected) => {
	f.log("connection successfully");
	bot.sendMessage(config.LogChat, "Bot is back online. Lost connection at " + f.getDateTime(LastConnectionLost))
});

bot.on(/^\/alive/i, (msg) => {
	let timediff = Date.now() - msg.date*1000;
	OS.Hardware.then(function(Hardware) {
		let Output = "";
		Output = Output + '\n- CPU: ' + Hardware.cpubrand + ' ' + Hardware.cpucores + 'x' + Hardware.cpuspeed + ' Ghz';
		Output = Output + '\n- Load: ' + f.Round2Dec(Hardware.load);
		Output = Output + '%\n- Memory Total: ' + f.Round2Dec(Hardware.memorytotal/1073741824) + ' GB'
		Output = Output + '\n- Memory Free: ' + f.Round2Dec(Hardware.memoryfree/1073741824) + ' GB'
		ping.promise.probe('api.telegram.org').then(function (ping) {
			msg.reply.text(`Botname: ${config.botname}\nVersion: ${package.version}\nPing: ${ping.avg}ms\n\nUptime: ${f.uptime(Time_started)}\n\nSystem: ${Output}`).then(function(msg)
			{
				setTimeout(function(){
				bot.deleteMessage(msg.chat.id,msg.message_id).catch(error => f.Elog('Error (deleteMessage):' + error.description));
				}, config.WTdelmsglong);
            });
            bot.deleteMessage(msg.chat.id, msg.message_id).catch(error => f.Elog('Error (deleteMessage):' + error.description));
		});
	});
});

bot.on(['/start', '/help'], (msg) => {
    if (msg.text.split(' ')[0].endsWith(config.botname) || msg.chat.type === "private") {
        msg.reply.text(`Commands:\n/alive to get bot stats\/namount to get amount of available pics\n/licenses\n/owl to get a random owl pic\n/fox to get a random fox pic`).catch(error => f.Elog('Error (sendReply):' + error.description));
    }
});

bot.on(/^\/licenses/i, (msg) => {
    if (msg.text.split(' ')[0].endsWith(config.botname) || msg.chat.type === "private") {
        msg.reply.text(`Fox Pics: https://randomfox.ca\nOwl Pics: https://pixabay.com/service/license/\nCat Pics: From @SitiSchu`, { parseMode: 'html' , webPreview: false}).catch(error => f.Elog('Error (sendReply):' + error.description));
    }
});

bot.on(/^\/amount/i, (msg) => {
    if (msg.text.split(' ')[0].endsWith(config.botname) || msg.chat.type === "private") {
        fs.readdir("./Owls", function(err, Owls) {
            if (err) {
            onError(err);
            }
            fs.readdir("./SitiSchu", function(err, Catpics) {
                if (err) {
                onError(err);
                }
                msg.reply.text(`Fox Pics: 122\nOwl Pics: ${Owls.length}\nCat Pics: ${Catpics.length}`, { parseMode: 'html' , webPreview: false}).catch(error => f.Elog('Error (sendReply):' + error.description));
            });
        });
    };
});

bot.on(/^\/owl/i, (msg) => {
    if (msg.text.split(' ')[0].endsWith(config.botname) || msg.chat.type === "private") {
        fs.readdir("./Owls", function(err, filenames) {
            if (err) {
            onError(err);
            }
            let radPicSelect = f.getRandomInt(filenames.length)
            bot.sendPhoto(msg.chat.id, `./Owls/${filenames[radPicSelect]}`).catch(error => f.Elog('Error (sendPhoto Owl):' + error.description));
        });
    }
});

bot.on(/^\/catpic/i, (msg) => {
    if(CatLimit === 0){
        if (msg.text.split(' ')[0].endsWith(config.botname) || msg.chat.type === "private") {
            fs.readdir("./SitiSchu", function(err, filenames) {
                if (err) {
                onError(err);
                }
                let radPicSelect = f.getRandomInt(filenames.length);
                CatArray.push(radPicSelect);
                bot.sendPhoto(msg.chat.id, `./SitiSchu/${filenames[radPicSelect]}`).catch(error => f.Elog('Error (sendPhoto CatPic):' + error.description));
                CatLimit = 1;
                if(CatArray.length > MaxLength){
                    CatArray.shift();
                }
            });
        }
    }else{
        let radArraySelect = f.getRandomInt(CatArray.length);
        let radPicSelect = CatArray[radArraySelect]
        fs.readdir("./SitiSchu", function(err, filenames) {
            if (err) {
            onError(err);
            }
            bot.sendMessage(msg.chat.id, `Ratelimit! New Pics at 00:00, 04:00, 08:00, 12:00, 16:00, 20:00\nRandomCatPic from last 24h FileIDs(${CatArray})`).then(function(Out) {
                bot.sendPhoto(msg.chat.id, `./SitiSchu/${filenames[radPicSelect]}`).catch(error => f.Elog('Error (sendPhoto CatPic):' + error.description));
            }).catch(error => f.Elog('Error (sendMessage CatPic):' + error.description));
        });
    }
});

bot.on(/^\/fox/i, (msg) => {
    if (msg.text.split(' ')[0].endsWith(config.botname) || msg.chat.type === "private") {
        request("https://randomfox.ca/floof/", { json: true }, (err, res, body) => {
            bot.sendPhoto(msg.chat.id, body.image).catch(error => f.Elog('Error (sendPhoto Fox):' + error.description));
        });
    }
});

/*----------------------Inline Handler--------------------------*/
//Inline Request Handler
bot.on('inlineQuery', msg => {
	var LastConnectionLost = new Date();

    let query = msg.query.toLowerCase();
    const answers = bot.answerList(msg.id, {cacheTime: 1});

    request("https://randomfox.ca/floof/", { json: true }, (err, res, body) => {

        // Photos
        /*
        answers.addPhoto({
            id: 'OWL',
            caption: 'Random OWL pic',
            photo_url: 'https://telegram.org/img/t_logo.png',
            thumb_url: 'https://telegram.org/img/t_logo.png'
        });*/
        answers.addPhoto({
            id: 'FOX',
            caption: 'Random FOX pic',
            photo_url: body.image,
            thumb_url: body.image
        });

        return bot.answerQuery(answers);
    });

});

function getHourDE(date) {

	var hour = date.getHours();
	hour = (hour < 10 ? "0" : "") + hour;
	
	var min  = date.getMinutes();
	min = (min < 10 ? "0" : "") + min;

	return hour + "" + min;
}

setInterval(function(){
    if(getHourDE(new Date()) === '0000'){
        CatLimit = 0;
        console.log("CatpicReset 00:00")
    }
    if(getHourDE(new Date()) === '0400'){
        CatLimit = 0;
        console.log("CatpicReset 04:00")
    }
    if(getHourDE(new Date()) === '0800'){
        CatLimit = 0;
        console.log("CatpicReset 08:00")
    }
    if(getHourDE(new Date()) === '1200'){
        CatLimit = 0;
        console.log("CatpicReset 12:00")
    }
    if(getHourDE(new Date()) === '1600'){
        CatLimit = 0;
        console.log("CatpicRese 16:00t")
    }
    if(getHourDE(new Date()) === '2000'){
        CatLimit = 0;
        console.log("CatpicReset 20:00")
    }
}, 60000);