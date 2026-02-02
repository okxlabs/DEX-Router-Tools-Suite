/**
 * Configuration index - exports all config modules
 */
const chains = require('./chains');
const pools = require('./pools');

module.exports = {
  ...chains,
  ...pools
};

