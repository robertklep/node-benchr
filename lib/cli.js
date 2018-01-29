const fs         = require('fs');
const path       = require('path');
const { docopt } = require('docopt');
const Runner     = require('./runner');

// Parse command line options.
const options = docopt(fs.readFileSync(__dirname + '/docopt.txt', 'utf8'), {
  version : require('../package').version
});

module.exports = function Benchr() {
  // Try to resolve reporter. If the passed value is a valid file, use it;
  // otherwise, assume it's the name of a built-in reporter.
  let reporter = options['--reporter'];

  try {
    reporter = require(path.resolve(process.cwd(), reporter));
  } catch(e) {
    try {
      reporter = require(path.resolve(__dirname, 'reporters', reporter));
    } catch(e) {
      return console.error(`Unable to successfully resolve reporter '${ options['--reporter'] }'.`);
    }
  }

  try {
    new Runner({
      reporter,
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
