var jstlWc = typeof(exports) == 'undefined' ? {} : exports;
;(function(exports){

	var settings = {
		cL	: '<wc:ft',
		cR	: '</wc:ft>',
		sT	: '#{',
		sL	: '{',
		sR	: '}',
		re	: {
			$code	: /<wc:ft(.+?)>([\s\S]+?)<\/wc:ft>$/i,
			$id		: /id\s*=\s*"(.+?)"/i,
			$if		: /if\s*=\s*"\#\{(.+?)\}"/i,
			$for	: /for\s*=\s*"\#\{(.+?)\}"/i,
			$else	: /else\s*=\s*"#(.+?)"/i
		}
	};
	/**
	 * 获取成对出现的符号中间的内容
	 * exp：
	 *	getPairs('(i+(i++))', '(',')') == i+(i++)
	 */
	var getPairs = function(str, l, r) {
		var str = str || '';
		var l = l == undefined ? settings.cL : l;
		var r = r == undefined ? settings.cR : r;
		var ret = '';
		var iL = str.indexOf(l);
		var iR = str.indexOf(r);
		var iN = str.indexOf(l, iL + l.length);
		var ret = {
			index	: -1,
			length	: 0,
			string	: ''
		};
		while(iN > 0 && iN < iR) {
			iR = str.indexOf(r, iR + r.length);
			iN = str.indexOf(l, iN + l.length);
		}
		if( iL == -1 ) {
			return ret;
		}
		else if( iR == -1 ) {
			throw('nested error[index:' + iL + ',line:' + str.substring(0,iL).split('\n').length + ']');
		}
		else {
			ret.index = iL;
			ret.length = iR - iL + r.length;
			ret.string = str.substring(iL, iR + r.length)
		}
		return ret;
	}
	/**
	 * 未完成...
	 */
	var extend = function() {
		var args = arguments;
		var deep = false;
		var target = args[0];
		if( typeof(args[0]) == 'boolean' ) {
			deep = args[0];
			target = args[1];
		}
		for(var i=(target == args[0] ? 1 : 2); i<args.length; i++) {
			var src = args[i];
			for(var attr in src) {
				target[attr] = src[attr];
			}
		}
		return target;
	}

	var render = function(code, options) {
		return compile(code, options).call();
	}
	var compile = function(code, options) {
		var ctx = extend(true, {}, options, {condition : {}});
		var opts = extend(true, {}, settings, options);
		return function(){
			return parse.call(ctx, opts, code);
		};
	}
	var parse = function(opts, code) {
		var oc = '';
		var ctx = this;
		while(true) {
			var ic = code.indexOf(opts.cL);
			var is = code.indexOf(opts.sT);
			if( ic != -1 && (is == -1 || ic < is) ) {
				var pair = compileCode.call(ctx, opts, code.substr(ic));
				oc += code.substring(0, ic) + pair.value;
				code = code.substring(ic + pair.length);
			}
			if( is != -1 && (ic == -1 || is < ic) ) {
				var pair = compileScript.call(ctx, opts, code.substr(is));
				oc += code.substring(0, is) + pair.value;
				code = code.substring(is + pair.length + opts.sT.length - opts.sL.length);
			}
			if( !code.length || (ic == -1 && is == -1) ) {
				oc += code;
				break;
			}
		}
		return oc;
	}
	var compileCode = function(opts, code) {
		var oc = '';
		var ctx = this;
		var pair = getPairs(code, opts.cL, opts.cR);
		if( pair.length ) {
			var $id = (pair.string.match(opts.re.$id) || [])[1] || ('#'+(new Date().getTime() + parseInt(Math.random()*100)));
			var $if = (pair.string.match(opts.re.$if) || [])[1];
			var $for = (pair.string.match(opts.re.$for) || [])[1];
			var $else = (pair.string.match(opts.re.$else) || [])[1];
			var $code = (pair.string.match(opts.re.$code) || [])[2];
			if( $code ) {
				if( $if ) {
					$if = ctx.condition[$id] = _eval('return (!!' + $if + ')', ctx);
				}
				if( $else ) {
					$else = !ctx.condition[$else];
				}
				var judge = $if !== undefined ? $if : ($else !== undefined ? $else : true);
				if( judge ) {
					if( $for ) {
						$for = _eval('return (' + $for + ')', ctx);
						ctx = extend(false, {}, ctx, {'$item' : null, '$i' : null});
						if( typeof($for) == 'number' ) {
							for(var i=0; i<$for; i++) {
								ctx['$i'] = i;
								ctx['$item'] = i;
								oc += parse.call(ctx, opts, $code);
							}
						}
						else if( typeof($for) == 'object' ) {
							for(var i in $for) {
								ctx['$i'] = i;
								ctx['$item'] = $for[i];
								oc += parse.call(ctx, opts, $code);
							}
						}
						else/* if( typeof($for) == 'array' ) */{
							for(var i=0; i<$for.length; i++) {
								ctx['$i'] = i;
								ctx['$item'] = $for[i];
								oc += parse.call(ctx, opts, $code);
							}
						}
					}
					else {
						oc += parse.call(ctx, opts, $code);
					}
				}
			}
		}
		return extend(pair, {value:oc});
	}
	var compileScript = function(opts, code) {
		var oc = '';
		var ctx = this;
		var pair = {length:0};
		var idx = code.indexOf(opts.sT);
		if( idx != -1 ) {
			code = code.substring(idx);
			pair = getPairs(code, opts.sL, opts.sR);
		}
		if( pair.length ) {
			var $code = pair.string;
				$code = $code.substring(opts.sL.length, $code.length - opts.sR.length);
			if( $code.charAt(0) == '=' ) {
				$code = 'return (' + $code.substr(1) + ')';
			}
			var ret = _eval($code, ctx);
			if( ret !== undefined ) {
				oc += ret;
			}
		}
		return extend(pair, {value:oc});
	};
	var _eval = function(code, ctx) {
		return new Function('ctx', 'with(ctx){' + code + '}').call(code, ctx);
	}

	exports.render = render;
	exports.compile = compile;
})(jstlWc);