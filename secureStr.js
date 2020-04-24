const SecureString = require('secure-string')
const fs = require('fs')

exports.secureStr = function (file)
{
    const password = new SecureString();
    const clearPassword = fs.readFileSync(file, 'utf8');
    //Faire try catch
    for (let i = 0; i < clearPassword.length; i++) {
        password.appendCodePoint(clearPassword.charCodeAt(i))
      }
    
    return password
}