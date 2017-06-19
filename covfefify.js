// covfefefies a string
// extracted from https://codegolf.stackexchange.com/questions/123685/covfefify-a-string

var covfefify = s => ([,a,b,c]=s.match`(.*?[aeiouy]+(.)).*?([aeiouy])`,a+(b=(a="bcdfgszkvtgp")[11-a.search(b)]||b)+c+b+c)
module.exports = covfefify
