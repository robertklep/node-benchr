var fs     = require('fs');
var docopt = require('docopt').docopt;
var Runner = require('./runner');

// Parse command line options.
var options = docopt(fs.readFileSync(__dirname + '/docopt.txt', 'utf8'), {
  version : require('../package').version
});

module.exports = function Benchr() {
  new Runner(options, options['<file>']).run();
};
