// A checker function that injects checker and matcher functionality to the discord bot as a sintactic sugar
function ApplyChecker(b) {
  b.checks = function (arg, cb) {
    if(arg){
      cb(b);
    }
  }

  b.matchs = function (regex, cb) {
    if(regex.test(b.content)){
      cb(b);
    }
  }

  b.command = function (command, cb) {
    var argList = b.content.split(" ")
    if(argList[0] == command){
      argList.shift()
      b.content = argList.join(" ")
      cb(b);
    }
  }
}

module.exports = ApplyChecker
