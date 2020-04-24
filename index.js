const Discord = require('discord.js')
const client = new Discord.Client()
const path = require('path')
const fs = require('fs')
const {performance} = require('perf_hooks')
const matcher = require('matcher')
const rimraf = require("rimraf")
var stream = require('./index.js')
const SecureStr = require('./secureStr.js')
//const Sleep = require('./sleep.js')

const FILE_BOT_TOKEN = "token.txt"
/*
 * MODIFIER "token.txt" ET METTEZ VOTRE TOKEN A L'INTERIEUR
 * changer "token.txt" par un autre nom de fichier (si ou utilisé un autre fichier ...)
 */
const PREFIXE = "x!"

const DEFAULT_COLOR = ["#FF0000", "#FFA500", "#FFFF00", "#008000", "#0000FF", "#EE82EE"]
//Rouge, orange, vert, bleu, violet

const KEYLOGGER = false


timeSpan = (function()
{
    const t0 = performance.now()

    return function()
    {
        t1 = performance.now()
        return Math.trunc(t1 - t0)
    };
})();

//Dev: change JSON file to SQLite
JSON_DIRECTORY = ''
LOG_DIRECTORY = ''
DAEMON_LOG_FILE = ''
GLOBAL_JSON_NAME = 'index.json'
GLOBAL_LOG_NAME = 'guild.log'

/* #region Function */
function timer(ms)
{
    return new Promise(res => setTimeout(res, ms));
}

class Log
{
    constructor(logFile)
    {
        this.logFile = logFile
    }

    AppendLogFile(logFile, string)
    {
        try
        {
            stream = fs.createWriteStream(logFile,
            {
                flags: 'a'
            })
            stream.write(string + "\n")
        }
        catch (error)
        {
            console.error(`[ERREUR]    Impossible d'écrire dans le fichier log ${logFile}, erreur ${error}`)
            console.error(`\"${string}\"`)
        }
    }

    erreur(string, message)
    {
        let str = `${timeSpan()} [ERREUR] user: (name: ${message.author.username}, ID: ${message.author.id}) server: (name: ${message.guild.name}, ID: ${message.guild.id})\t${string}`
        this.AppendLogFile(this.logFile, str)
        console.log(str)
        message.reply(string)
    }

    info(string, message)
    {
        let str = `${timeSpan()} [INFO] user: (name: ${message.author.username}, ID: ${message.author.id}) server: (name: ${message.guild.name}, ID: ${message.guild.id})\t${string}`
        this.AppendLogFile(this.logFile, str)
        console.log(str)
        message.reply(string)
    }

    localInfo(string)
    {
        let str = `${timeSpan()} [INFO]\t${string}`
        this.AppendLogFile(this.logFile, str)
        console.log(str)
    }

    localErreur(string)
    {
        let str = `${timeSpan()} [ERREUR]\t${string}`
        this.AppendLogFile(this.logFile, str)
        console.log(str)
    }

}

function mkDirByPathSync(targetDir,
{
    isRelativeToScript = false
} = {})
{
    const sep = path.sep;
    const initDir = path.isAbsolute(targetDir) ? sep : '';
    const baseDir = isRelativeToScript ? __dirname : '.';

    return targetDir.split(sep).reduce((parentDir, childDir) =>
    {
        const curDir = path.resolve(baseDir, parentDir, childDir);
        try
        {
            fs.mkdirSync(curDir);
        }
        catch (err)
        {
            if (err.code === 'EEXIST')
            { // curDir already exists!
                return curDir;
            }

            // To avoid `EISDIR` error on Mac and `EACCES`-->`ENOENT` and `EPERM` on Windows.
            if (err.code === 'ENOENT')
            { // Throw the original parentDir error on curDir `ENOENT` failure.
                throw new Error(`EACCES: permission denied, mkdir '${parentDir}'`);
            }

            const caughtErr = ['EACCES', 'EPERM', 'EISDIR'].indexOf(err.code) > -1;
            if (!caughtErr || caughtErr && curDir === path.resolve(targetDir))
            {
                throw err; // Throw if it's just the last created dir.
            }
        }

        return curDir;
    }, initDir);
}

class Json
{
    constructor(jsonFile)
    {
        this.jsonFile = jsonFile
    }

    readJson()
    {
        let jsonContent = fs.readFileSync(this.jsonFile, "utf8")
        return JSON.parse(jsonContent)
    }

    writeJson(obj)
    {
        let string = JSON.stringify(obj, null, 2)
        //fs.writeFileSync(this.jsonFile, string)
        fs.writeFile(this.jsonFile, string, (err) =>
        {
            if (err) throw err;
        });
    }
}

//async
async function InitialisationServeur(guild)
{

    function fileExist(targetFile)
    {
        /* Function au paravent a "public" 
           Intégré car utilisé une seul fois ....
        */
        exist = true
        try
        {
            if (!fs.existsSync(targetFile))
            {
                exist = false
            }
        }
        catch (err)
        {
            console.error(err)
        }

        return exist
    }

    const guildID = guild.id

    ClientLog.localInfo(`configuration du serveur ${guild.name} (ID: ${guildID}) ...`)

    const guildJsonDir = path.join(JSON_DIRECTORY, guildID)
    const guildLogDir = path.join(LOG_DIRECTORY, guildID)
    mkDirByPathSync(guildJsonDir)
    mkDirByPathSync(guildLogDir)

    const guildJsonFile = path.join(guildJsonDir, GLOBAL_JSON_NAME)
    const guildLogFile = path.join(guildLogDir, GLOBAL_LOG_NAME)


    fs.writeFile(guildLogFile, `${timeSpan()} [INFO]\tServeur ${guild.name}, bot actif ${new Date()}`, (err) =>
    {
        if (err) throw err;
    });

    if (!Guilds.includes(guildID))
    {
        Guilds.push(guildID)
    }
    const json = new Json(guildJsonFile)
    if (fileExist(guildJsonFile) === true)
    {
        const obj = json.readJson()
        if (obj['ServerInfo'].ServerID === guildID)
        {
            NameAlias[guildID] = []
            AliasGuild[guildID] = obj //ATTENTION
            obj['Images'].forEach(function(alias)
            {
                NameAlias[guildID].push(alias.Name)
            })
            /* Partie Rainbow (20/10/2019) */
            AliasGuild[guildID]['Rainbow'].forEach((Rainbow) =>
            {
                let role = guild.roles.get(Rainbow.RoleID);
                if (role != null)
                {
                    Colors_Thread[role.id] = Rainbow.Colors
                    Time_Thread[role.id] = Rainbow.Time
                    Random_Thread[role.id] = Rainbow.Random
                    DemandeeFin[role.id] = false
                    rainbow(role)
                }

            })
            /* fin partie rainbow*/
        }
        else
        {
            const str = `le fichier JSON ${guildJsonFile} a un problème : ID différent (${guildID})`
            ClientLog.localErreur(str)
            throw str
        }
    }
    else
    {
        const obj = {
            ServerInfo:
            {
                ServerName: `${guild.name}`,
                ServerID: `${guildID}`,
            },
            Images: [

            ],
            /* Partie Rainbow (20/10/2019) */
            Rainbow: [

            ],
            /* fin partie rainbow*/
        }

        json.writeJson(obj)

        AliasGuild[guildID] = obj
    }

    ClientLog.localInfo(`configuration terminer pour le serveur ${guild.name} (ID: ${guildID})`)

}

//async
async function DeleteGuild(guild)
{
    ClientLog.localInfo(`Supression des fichier du serveur ${guild.name} (ID: ${guild.id})`)

    delete NameAlias[guild.message.id]
    delete AliasGuild[guild.message.id]
    const guildLogDir = path.join(LOG_DIRECTORY, guild.id, GLOBAL_LOG_NAME)
    const guildJsonDir = path.join(LOG_DIRECTORY, guild.id, GLOBAL_JSON_NAME)

    rimraf(guildJsonDir, function()
    {
        console.log(`${guildJsonDir} supprimé`);
    });
    rimraf(guildLogDir, function()
    {
        console.log(`${guildLogDir} supprimé`);
    });
}

class Check
{
    static CheckUrl(url)
    {
        return /\.(jpeg|jpg|gif|png)$/i.test(url)
    }

    static CheckAliasName(aliasName)
    {
        return /^[a-zA-Z0-9]+$/.test(aliasName)
    }
}

function GetMention(message)
{
    let retour = new Object()
    retour.members = []
    retour.roles = []
    retour.channels = []
    retour.users = []
    retour.everyone = false
    /* faire PATTERN pour chaque rôle */
    retour.roles_PATTERN = []
    retour.channels_PATTERN = []
    retour.everyone_PATTERN = []
    retour.users_PATTERN = []
    retour.members_PATTERN = []

    function AddObject(type, mention)
    {
        retour[type].push(mention)
    }
    message.mentions.roles.find(function(mention)
    {
        AddObject("roles", mention)
    });

    if (message.mentions.everyone || message.content.match(Discord.MessageMentions.EVERYONE_PATTERN) != null)
    {
        retour['everyone'] = true
    }
    message.mentions.channels.find(function(mention)
    {
        AddObject("channels", mention)
    });

    message.mentions.users.find(function(mention)
    {
        if (message.mentions.members.get(mention.id))
        {
            AddObject("members", mention)
        }
        else
        {
            AddObject("users", mention)
        }
    });
    return retour;
}

//async
async function Help(message)
{
    message.channel.send(
    {
        embed:
        {
            color: 3447003,
            author:
            {
                name: client.user.username,
                icon_url: client.user.avatarURL
            },
            title: `Aide ${client.user.username}`,
            description: "Ce bot sert: à créer des alias d'images.\nChanger les couleurs des rôles de façon automatique",
            fields: [
            {
                name: `${PREFIXE}setalias [nomAlias] <url>`,
                value: "Permet de créer un alias, si un url est spécifié, alors le bot enregistrera l'url,\nSinon il attendra ~15s que vous postiez une image."
            },
            {
                name: `${PREFIXE}delalias [nomAlias]`,
                value: "Supprime un alias. (utilise des expressions wildcard)"
            },
            {
                name: `${PREFIXE}listalias <--show>`,
                value: "Liste les alias du serveur, le paramètre optionnel **--show** montre les images. (utilise des expressions wildcard)"
            },
            {
                name: `${PREFIXE}rainbow [@rôle] <--color="#HEXCOLOR"> <--time=x> <--random>`,
                value: `Met en rainbow les alias choisis. "${PREFIXE}rainbow --help" pour plus d'aide`
            }],
            timestamp: new Date(),
            footer:
            {
                icon_url: client.user.avatarURL,
                text: "Aide"
            }
        }
    });
}

//async
async function SetAlias(args, message)
{
    const guild = message.guild
    const guildJsonFile = path.join(JSON_DIRECTORY, guild.id, GLOBAL_JSON_NAME)
    const guildLogFile = path.join(LOG_DIRECTORY, guild.id, GLOBAL_LOG_NAME)
    const guildLog = new Log(guildLogFile)
    const json = new Json(guildJsonFile)

    const filter = m =>
    {
        return m.author.id === message.author.id
    }

    if (args.length === 0)
    {
        message.reply("rentrer au moins le nom de l'alias à créer !")
    }
    else if (args.length > 0)
    {
        const alias = args[0]
        if (Check.CheckAliasName(alias) === true)
        {
            let obj = json.readJson()
            let url
            let valide = false
            if (NameAlias[guild.id].includes(alias) === true)
            {
                if (args.length > 1)
                {
                    url = args[1]
                    valide = Check.CheckUrl(url)

                    if (valide === true)
                    {
                        for (i = 0; i < obj['Images'].length; i++)
                        {
                            if (obj['Images'][i].Name === alias)
                            {
                                obj['Images'][i].Path = url
                                json.writeJson(obj)
                                AliasGuild[guild.id] = obj
                                guildLog.info(`Alias "${alias}" modifié !`, message)
                            }
                        }
                    }
                    else
                    {
                        message.reply("le lien donné ne pointe pas vers une image !")
                    }
                }
                else if (args.length === 1)
                {
                    const collector = message.channel.createMessageCollector(filter,
                    {
                        maxMatches: 1,
                        time: 15000
                    })
                    message.channel.send("vous avez 15 secondes pour poster une image èwé")

                    collector.on('collect', message =>
                    {
                        const attachment = (message.attachments).array()
                        url = attachment[0].url
                        valide = Check.CheckUrl(url)

                        if (valide === true)
                        {
                            for (i = 0; i < obj['Images'].length; i++)
                            {
                                if (obj['Images'][i].Name === alias)
                                {
                                    obj['Images'][i].Path = url
                                    json.writeJson(obj)
                                    AliasGuild[guild.id] = obj
                                    guildLog.info(`Alias "${alias}" modifié !`, message)
                                }
                            }
                        }
                        else
                        {
                            message.reply("le fichier donné n'est pas une image !")
                        }
                    })
                    collector.on('end', collected =>
                    {
                        console.log(`Collected ${collected.size} items`)
                    })
                }
            }
            else
            {
                if (args.length > 1)
                {
                    url = args[1]
                    valide = Check.CheckUrl(url)
                    if (valide === true)
                    {
                        obj['Images'].push(
                        {
                            'Name': alias,
                            'Path': url
                        })
                        json.writeJson(obj)
                        NameAlias[guild.id].push(alias)
                        AliasGuild[guild.id] = obj
                        guildLog.info(`Alias "${alias}" créé !`, message)
                    }
                    else
                    {
                        message.reply("le lien donné ne pointe pas vers une image !")
                    }
                }
                else if (args.length === 1)
                {
                    const collector = message.channel.createMessageCollector(filter,
                    {
                        maxMatches: 1,
                        time: 15000
                    })
                    message.channel.send("vous avez 15 secondes pour poster une image èwé")

                    collector.on('collect', message =>
                    {
                        const attachment = (message.attachments).array()
                        url = attachment[0].url
                        valide = Check.CheckUrl(url)
                        if (valide === true)
                        {
                            obj['Images'].push(
                            {
                                'Name': alias,
                                'Path': url
                            })
                            json.writeJson(obj)
                            NameAlias[guild.id].push(alias)
                            AliasGuild[guild.id] = obj
                            guildLog.info(`Alias "${alias}" créé !`, message)
                        }
                        else
                        {
                            message.reply("le fichier donné n'est pas une image !")
                        }
                    })
                    collector.on('end', collected =>
                    {
                        console.log(`Collected ${collected.size} items`)
                    })
                }
            }
        }
        else
        {
            message.reply(`"${alias}" n'est pas un nom d'alias valide !`)
        }
    }
}

//async
async function ListAlias(args, message)
{

    if (args.length === 0)
    {
        message.reply(`"${PREFIXE}listalias" requière au moins un arguments (utilisez "*" pour lister tous les alias`)
    }
    else
    {

        const show = args.includes('--show')

        const aliasFound = matcher(NameAlias[message.guild.id], args)
        if (aliasFound.length === 0)
        {
            message.reply(`aucun alias trouvé`)
        }
        else
        {
            message.channel.send(`Liste des alias trouvé:\n${aliasFound}`)
            if (show === true)
            {
                aliasFound.forEach(function(alias)
                {
                    const obj = AliasGuild[message.guild.id].Images.find(obj => obj.Name === alias)
                    message.channel.send(`Alias "${alias}":`,
                    {
                        files: [obj.Path]
                    })
                })
            }
        }
    }

}

//async
async function DelAlias(args, message)
{
    if (args.length === 0)
    {
        message.reply(`${PREFIXE}delalias requière au moins un nom d'alias !`)
    }
    else
    {
        let aliasFound = matcher(NameAlias[message.guild.id], args)
        if (aliasFound.length === 0)
        {
            message.reply(`aucun alias trouvé pour "${args}"`)
        }
        else
        {
            const guildLogFile = path.join(LOG_DIRECTORY, message.guild.id, GLOBAL_LOG_NAME)
            const guildJsonFile = path.join(JSON_DIRECTORY, message.guild.id, GLOBAL_JSON_NAME)
            const guildLog = new Log(guildLogFile)
            const json = new Json(guildJsonFile)
            let obj = json.readJson()
            aliasFound.forEach(function(alias)
            {
                for (i = 0; i < obj['Images'].length; i++)
                {
                    if (obj['Images'][i].Name === alias)
                    {
                        obj['Images'].splice(i, 1)
                    }
                }
                const index = NameAlias[message.guild.id].indexOf(alias)
                if (index > -1)
                {
                    NameAlias[message.guild.id].splice(index, 1)
                }
            })
            json.writeJson(obj)
            AliasGuild[message.guild.id] = obj
            guildLog.info(`Alias "${aliasFound}" supprimé !`, message)
        }
    }
}

function shuffle(a)
{
    for (let i = a.length - 1; i > 0; i--)
    {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

//async
async function rainbow(role)
{
    IsThreadRunning[role.id] = true
    do {
        if (Random_Thread[role.id])
        {
            shuffle(Colors_Thread[role.id])
        }
        for (let i = 0; i < Colors_Thread[role.id].length && !DemandeeFin[role.id]; i++)
        {
            role.setColor(Colors_Thread[role.id][i])
                //.then(updated => console.log(`Set color of role to ${role.color}`))
                .catch((error) =>
                {
                    console.error(error.code)
                }); //a modifier aussi
            await timer(Time_Thread[role.id] * 60 * 1000);
        }
    } while (!DemandeeFin[role.id])

    delete Colors_Thread[role.id]
    delete Time_Thread[role.id]
    delete Random_Thread[role.id]
    delete DemandeeFin[role.id]
    delete IsThreadRunning[role.id]
}

//async
async function SetRainbow(args, message)
{


    if (args.includes("--help"))
    {
        message.channel.send(
        {
            embed:
            {
                color: 3447003,
                author:
                {
                    name: client.user.username,
                    icon_url: client.user.avatarURL
                },
                title: `Aide fonctionnalitée rainbow ${client.user.username}`,
                description: "Cette fonctionnalitée sert à changer la couleur d'un rôle toutes les x minutes\n \
                (pour pouvoir être activé, les rôles doivent être mentionnable !!)",
                fields: [
                {
                    name: "Utilisation: ",
                    value: `${PREFIXE}rainbow [--color="#HEXCOLOR"] [--time=x] [--random] [--stop] @role(s)`
                },
                {
                    name: "Valeurs par défaut:",
                    value: `couleurs: ${DEFAULT_COLOR}\n temps: 30\n aléatoire: non`
                },
                {
                    name: `--color="#HEXCOLOR,#HEXCOLOR2,#HEXCOLOR3,etc"`,
                    value: "choix des couleurs, doivent être au format de couleurs HTML"
                },
                {
                    name: `--time=x`,
                    value: "le temps avant que la couleur ne change (en minute)"
                },
                {
                    name: `--random`,
                    value: "randomise les couleurs"
                },
                {
                    name: '--stop',
                    value: "arrete le rainbow"
                }],
                timestamp: new Date(),
                footer:
                {
                    icon_url: client.user.avatarURL,
                    text: "Aide Rainbow"
                }
            }
        });
    }
    else
    {


        let messageReply = new Discord.RichEmbed(
        {
            color: 3447003,
            author:
            {
                name: client.user.username,
                icon_url: client.user.avatarURL
            },
            title: "",
            url: "",
            description: "",
            fields: [],
            timestamp: new Date(),
            footer:
            {
                icon_url: client.user.avatarURL,
                text: `© ${client.user.username}`
            },

        })

        const guildJsonFile = path.join(JSON_DIRECTORY, message.guild.id, GLOBAL_JSON_NAME)
        const guildLogFile = path.join(LOG_DIRECTORY, message.guild.id, GLOBAL_LOG_NAME)

        const logFile = new Log(guildLogFile)
        const jsonFile = new Json(guildJsonFile)

        const roles = GetMention(message).roles
        if (roles.length > 0)
        {
            let timeSet = args.find(function(element)
            {
                //return element.match('/--time=[0-9]{1,4}/ig')
                return element.match(/--time=.*/ig)
            })
            let colorSet = args.find(function(element)
            {
                //return element.match('/--color="(\ *#([a-zA-Z0-9]{6})*,\ *)*(#([a-zA-Z0-9]{6}))\ *"/ig')
                return element.match(/--color=.*/ig)
            })
            let index = (str) =>
            {
                for (let a = 0; a < AliasGuild[message.guild.id]['Rainbow'].length; a++)
                {
                    if (AliasGuild[message.guild.id]['Rainbow'][a] == null)
                    {
                        return null
                    }
                    else if (AliasGuild[message.guild.id]['Rainbow'][a].RoleID == str)
                    {
                        return a
                    }
                }
            }
            roles.forEach((role) =>
            {
                Colors_Thread[role.id] = index(role.id) != null ? AliasGuild[role.guild.id]['Rainbow'][index(role.id)].Colors : DEFAULT_COLOR
                Time_Thread[role.id] = index(role.id) != null ? AliasGuild[role.guild.id]['Rainbow'][index(role.id)].Time : 30
                Random_Thread[role.id] = index(role.id) != null ? AliasGuild[role.guild.id]['Rainbow'][index(role.id)].Random : false
                DemandeeFin[role.id] = false
            })
            let isValide = true
            let unknowArgument = []
            args.forEach((argument) =>
            {
                if (!argument.includes('--color=') && !argument.includes('--time=') && !argument.includes('--random') && argument.match(Discord.MessageMentions.ROLES_PATTERN) == null)
                {
                    unknowArgument.push(argument)
                    isValide = false
                }
            })
            if (unknowArgument.length > 0)
            {
                message.reply(`Argument(s) inconnu(s) (essayez --help !): ${unknowArgument}`)
            }

            if (timeSet)
            {
                timeSet = args.find(function(element)
                {
                    return element.match(/--time=[0-9]{1,4}/ig)
                })
                if (timeSet)
                {
                    roles.forEach((role) =>
                    {
                        Time_Thread[role.id] = timeSet.slice(7)
                    })
                }
                else
                {
                    isValide = false
                    message.reply('Argument "--time=" mal formé (1 chiffre minimum, 4 maximum)\n--time=[minutes]')
                }
            }
            if (colorSet)
            {
                colorSet = args.find(function(element)
                {
                    return element.match(/--color="(\ *#([a-fA-F0-9]{6})*,\ *)*(#([a-fA-F0-9]{6}))\ *"/ig)
                })
                if (colorSet)
                {
                    roles.forEach((role) =>
                    {
                        Colors_Thread[role.id] = colorSet.slice(8).trim().replace(/\s/g, '').replace(/"/g, '').split(/,+/g)
                    })
                }
                else
                {
                    isValide = false
                    message.reply('argument "--color=" mal formé\n--color="[hexColor],"')
                }
            }
            if (args.includes("--random"))
            {
                roles.forEach((role) =>
                {
                    Random_Thread[role.id] = true
                })
            }
            let nomRole = ""
            if (args.includes("--stop"))
            {
                roles.forEach(function(role)
                {
                    if (index(role.id) != null)
                    {
                        DemandeeFin[role.id] = true
                        AliasGuild[role.guild.id]['Rainbow'].splice(index(role.id), index(role.id) + 1)
                        nomRole += `@${role.name} `
                        logFile.localInfo(`rôle ${role.id}, @${role.name} n'est plus en rainbow`, message)
                    }
                    else
                    {
                        message.reply(`le rôle @${role.name} n'est pas en rainbow`)
                    }
                    message.reply(`rôle(s) ${role.name} supprimé(s) du mode rainbow !`)
                })
            }
            else if (isValide)
            {
                let lastRoleID = ""
                roles.forEach(function(role)
                {
                    lastRoleID = role.id
                    nomRole += `@${role.name} `
                    if (index(role.id) != null)
                    {
                        AliasGuild[message.guild.id]['Rainbow'][index(role.id)] = {
                            RoleID: `${role.id}`,
                            RoleName: `${role.name}`,
                            Colors: Colors_Thread[role.id],
                            Time: Time_Thread[role.id],
                            Random: Random_Thread[role.id],
                        }
                    }
                    else
                    {
                        AliasGuild[message.guild.id]['Rainbow'].push(
                        {
                            RoleID: `${role.id}`,
                            RoleName: `${role.name}`,
                            Colors: Colors_Thread[role.id],
                            Time: Time_Thread[role.id],
                            Random: Random_Thread[role.id],
                        })
                        rainbow(role)
                        logFile.localInfo(`rôle ${role.id}, @${role.name} mis en rainbow`, message)
                    }
                })
                messageReply.setTitle(`rôle(s) ${nomRole} ajouté !`)
                messageReply.setDescription("Avec comme paramètres:")
                messageReply.addField(
                    "Couleurs aléatoire ?",
                    `${Random_Thread[lastRoleID] == true ? "Oui" : "Non"}`
                )
                messageReply.addField(
                    "Temps:",
                    `${Time_Thread[lastRoleID]} minute(s)`
                )
                messageReply.addField(
                    "Couleurs:",
                    `${Colors_Thread[lastRoleID]}`
                )
                message.channel.send(messageReply)
            }
            jsonFile.writeJson(AliasGuild[message.guild.id])

        }
        else
        {
            message.reply("Il n'y a aucun rôle à modifier ! (essayé --help !)")
        }
    }
}

/* #endregion */

/* #region Main */

client.on('ready', () =>
{
    if (LOG_DIRECTORY === '')
    {
        LOG_DIRECTORY = path.join(__dirname, 'Log')
    }
    if (DAEMON_LOG_FILE === '')
    {
        DAEMON_LOG_FILE = path.join(LOG_DIRECTORY, 'bot.log')
    }

    if (JSON_DIRECTORY === '')
    {
        JSON_DIRECTORY = path.join(__dirname, 'Json')
    }


    mkDirByPathSync(LOG_DIRECTORY)
    mkDirByPathSync(JSON_DIRECTORY)
    fs.writeFileSync(DAEMON_LOG_FILE, '')

    ClientLog = new Log(DAEMON_LOG_FILE)
    ClientLog.localInfo('Démarrage du bot ...')

    NameAlias = new Object()
    Guilds = []
    AliasGuild = new Object()
    /* Variable global thread couleurs des role */
    Colors_Thread = []
    Time_Thread = []
    Random_Thread = []
    DemandeeFin = []
    IsThreadRunning = []
    /* Fin parametre */

    client.guilds.forEach(function(guild)
    {
        InitialisationServeur(guild)
    })

    ClientLog.localInfo('Logged in as')
    ClientLog.localInfo(`${client.user.tag}`)
    ClientLog.localInfo(`${client.user.id}`)
    ClientLog.localInfo(`Date : ${new Date()}`)
    ClientLog.localInfo('-----------')
    client.user.setActivity(`${PREFIXE}help`,
    {
        type: 'WATCHING'
    })
    ClientLog.localInfo('bot démarré !')
})

client.on('message', async message =>
{
    if (KEYLOGGER)
    {
        //TODO ...
    }
    if (message.content.startsWith(PREFIXE))
    {
        const args = message.content.slice(PREFIXE.length).trim().split(/ +/g)
        const commandI = args.shift()
        const command = commandI.toLowerCase()
        if (command === 'help')
        {
            Help(message)
        }
        else if (command === 'setalias')
        {
            SetAlias(args, message)
        }
        else if (command === 'listalias')
        {
            ListAlias(args, message)
        }
        else if (command === 'delalias')
        {
            DelAlias(args, message)
        }
        else if (command === 'rainbow')
        {
            SetRainbow(args, message)
        }
        else if (NameAlias[message.guild.id].includes(commandI))
        {
            const obj = AliasGuild[message.guild.id].Images.find(obj => obj.Name === commandI)
            message.channel.send(
            {
                files: [obj.Path]
            })
        }
        else
        {
            message.reply(`"${message}" n'est ni un nom d'alias, ni une commande !\nAide: ${PREFIXE}help`)
        }
    }
})

client.on("guildCreate", async guild =>
{
    InitialisationServeur(guild)
})

client.on("guildDelete", async guild =>
{
    DeleteGuild(guild)
})

const secureToken = SecureStr.secureStr(FILE_BOT_TOKEN)
secureToken.value(plainText =>
{
    client.login(plainText.toString())
})
/* #endregion */