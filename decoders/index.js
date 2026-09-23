const mayurDecoder = require('./mayur_decoder');
const rassDecoder = require('./rass_decoder');
const smartiDecoder = require('./smarti_decoder');
const smartiIiflDecoder = require('./smarti_iifl_decoder');
const raxDecoder = require('./rax_decoder');
const securicoDecoder = require('./securico_decoder');
const intellitechDecoder = require('./intellitech_decoder');

module.exports = {
  mayur: mayurDecoder,
  rass: rassDecoder,
  smarti: smartiDecoder,
  smarti_iifl: smartiIiflDecoder,
  rax: raxDecoder,
  securico: securicoDecoder,
  intellitech: intellitechDecoder
};

