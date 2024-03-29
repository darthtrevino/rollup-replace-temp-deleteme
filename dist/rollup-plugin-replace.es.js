import MagicString from 'magic-string';
import { createFilter } from 'rollup-pluginutils';

function escape(str) {
  return str.replace(/[-[\]/{}()*+?.\\^$|]/g, '\\$&');
}

function ensureFunction(functionOrValue) {
  if (typeof functionOrValue === 'function') { return functionOrValue; }
  return function () { return functionOrValue; };
}

function longest(a, b) {
  return b.length - a.length;
}

function getReplacements(options) {
  if (options.values) {
    return Object.assign({}, options.values);
  }
  var values = Object.assign({}, options);
  delete values.delimiters;
  delete values.include;
  delete values.exclude;
  delete values.sourcemap;
  delete values.sourceMap;
  return values;
}

function mapToFunctions(object) {
  return Object.keys(object).reduce(function (fns, key) {
    var functions = Object.assign({}, fns);
    functions[key] = ensureFunction(object[key]);
    return functions;
  }, {});
}

function replace(options) {
  if ( options === void 0 ) options = {};

  var filter = createFilter(options.include, options.exclude);
  var delimiters = options.delimiters;
  var functionValues = mapToFunctions(getReplacements(options));
  var keys = Object.keys(functionValues)
    .sort(longest)
    .map(escape);

  var pattern = delimiters
    ? new RegExp(((escape(delimiters[0])) + "(" + (keys.join('|')) + ")" + (escape(delimiters[1]))), 'g')
    : new RegExp(("\\b(" + (keys.join('|')) + ")\\b"), 'g');

  function executeReplacement(code, id) {
    var magicString = new MagicString(code);

    var hasReplacements = false;
    var match;
    var start;
    var end;
    var replacement;

    // eslint-disable-next-line no-cond-assign
    while ((match = pattern.exec(code))) {
      hasReplacements = true;

      start = match.index;
      end = start + match[0].length;
      replacement = String(functionValues[match[1]](id));

      magicString.overwrite(start, end, replacement);
    }

    if (!hasReplacements) { return null; }

    var result = { code: magicString.toString() };
    if (options.sourceMap !== false && options.sourcemap !== false)
      { result.map = magicString.generateMap({ hires: true }); }

    return result;
  }

  return {
    name: 'replace',

    renderChunk: function renderChunk(code, chunk) {
      var id = chunk.fileName;
      if (!keys.length) { return null; }
      if (!filter(id)) { return null; }
      return executeReplacement(code, id);
    },

    transform: function transform(code, id) {
      if (!keys.length) { return null; }
      if (!filter(id)) { return null; }
      return executeReplacement(code, id);
    }
  };
}

export default replace;
