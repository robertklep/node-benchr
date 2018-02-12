const fs         = require('fs');
const { docopt } = require('docopt');

// Parse command line options.
const options = docopt(fs.readFileSync(__dirname + '/docopt.txt', 'utf8'), {
  version : require('../package').version
});

module.exports = function Benchr() {
  let mod = options['--require'];
  if (mod) {
    try {
      require(mod);
    } catch(e) {
      return console.error(`Unable to require module '${ mod }':`, e);
    }
  }
  const Runner = require('./runner');
  try {
    new Runner({
      reporter    : options['--reporter'],
      grep        : options['--grep'],
      delay       : options['--delay'],
      minTime     : options['--min-time'],
      maxTime     : options['--max-time'],
      progress    : options['--progress'],
      prettyPrint : options['--pretty-print'],
      verbose     : options['--verbose'],
    }, options['<file>']).run();
  } catch(e) {
    return console.error('Cannot instantiate Runner:', e.message);
  }
};
