var Runner = require('./runner');

module.exports.run = function() {
  if (process.argv.length < 3) {
    console.error('Use: %s FILE[ FILE FILE ...]', process.argv[1].replace(/^.*\//, ''));
    process.exit(1);
  }
  Runner(process.argv.slice(2)).run();
};
