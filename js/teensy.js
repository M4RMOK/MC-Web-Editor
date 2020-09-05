// ***********************
// ****** Functions ******
// ***********************


function connect() {
    if (navigator.requestMIDIAccess)
        navigator.requestMIDIAccess({sysex: true}).then( onMIDISuccess, onMIDIFailure );
    else
        alert("No MIDI support present in your browser.");
}

function onMIDISuccess(midi) {
   // Reset.
    midiIn = null;
    midiOut = null;
    midiAccess = midi;

    midiInputOk = false;
    midiOutputOk = false;

    // MIDI devices that send you data.
    for (var input of midiAccess.inputs.values()) {
        if (input.name == 'Teensy MIDI') {
            midiIn = input;
            midiInputOk = true;
        }
    }

    // MIDI devices that you send data to.
    for (var output of midiAccess.outputs.values()) {
        if (output.name == 'Teensy MIDI') {
            midiOut = output;
            midiOutputOk = true;
        }
    }

    if (midiInputOk && midiOutputOk) {
        midiIn.addEventListener('midimessage', midiMessageReceived);
        $('#con_dis_button').removeClass('btn-primary');
        $('#con_dis_button').addClass('btn-success');
        $('#con_dis_button').text('Teensy MIDI');
        sendPresetRequest();
    } else {
        alert("No Teensy MIDI found.");
    }
}


function midiMessageReceived(midiMessage) {
	console.log(midiMessage);
	presetData = [].slice.call(midiMessage.data);
	let allCode = presetData.shift();
	let code = allCode&240;
	let midiChannel = (allCode&15)+1;

	if (code == 240) { // Initial Sysex code F0
		// Clear forms
		$('div.msg').each(function() {
			$(this).find('form')[0].reset();
		});
		// General data
		var USBTypeMsg = presetData.shift();
		switch (USBTypeMsg) {
			// Preset Data
			case 1:
				bankNumber = presetData.shift();
				$('#bank_number').text(bankNumber);
				pageNumber = presetData.shift();
				buttonNumber = presetData.shift();
				if (pageNumber == 1) {
					$('#preset_number').text(presetsName[buttonNumber-1]);
				} else {
					$('#preset_number').text(presetsName[(buttonNumber-1)+n_presets]);
				}

				// Preset data
				let presetType = presetData.shift();
				if (presetType == 0) {
					$('#preset_type_button').data('preset-type', '0');
					$('#preset_type_button').text('Preset Type: Preset');
				} else if (presetType == 1) {
					$('#preset_type_button').data('preset-type', '1');
					$('#preset_type_button').text('Preset Type: Effect');
				} else {
					$('#preset_type_button').text('¡Error!');
				}
				let longName = intToAscii(presetData, 25);
				$('#long_name').val(longName);
				let pShortName = intToAscii(presetData, 9);
				$('#p_short_name').val(pShortName);
				let pToggleName = intToAscii(presetData, 9);
				$('#p_toggle_name').val(pToggleName);
				let pToggleMode = presetData.shift();
				let pToogleModeButton = $('.toggle-mode-button').eq(0);
				if (pToggleMode == 0) {
					pToogleModeButton.data('toggle-mode', '0');
					pToogleModeButton.text('Toggle Mode Off');
					pToogleModeButton.css({color: 'white'});
				} else if (pToggleMode == 1) {
					pToogleModeButton.data('toggle-mode', '1');
					pToogleModeButton.text('Toggle Mode On');
					pToogleModeButton.css({color: 'yellow'});
				} else {
					pToogleModeButton.text('¡Error!');
				}
				let lpShortName = intToAscii(presetData, 9);
				$('#lp_short_name').val(lpShortName);
				let lpToggleName = intToAscii(presetData, 9);
				$('#lp_toggle_name').val(lpToggleName);
				let lpToggleMode = presetData.shift();
				let lpToogleModeButton = $('.toggle-mode-button').eq(1);
				if (lpToggleMode == 0) {
					lpToogleModeButton.data('toggle-mode', '0');
					lpToogleModeButton.text('Toggle Mode Off');
					lpToogleModeButton.css({color: 'white'});
				} else if (lpToggleMode == 1) {
					lpToogleModeButton.data('toggle-mode', '1');
					lpToogleModeButton.text('Toggle Mode On');
					lpToogleModeButton.css({color: 'yellow'});
				} else {
					pToogleModeButton.text('¡Error!');
				}

				// Led colors
				r1 = PadLeft(((presetData.shift())*2).toString(16), 2);
				g1 = PadLeft(((presetData.shift())*2).toString(16), 2);
				b1 = PadLeft(((presetData.shift())*2).toString(16), 2);
				$('#color1').val('#'+r1+g1+b1);
				r2 = PadLeft(((presetData.shift())*2).toString(16), 2);
				g2 = PadLeft(((presetData.shift())*2).toString(16), 2);
				b2 = PadLeft(((presetData.shift())*2).toString(16), 2);
				$('#color2').val('#'+r2+g2+b2);

				// Messages data
				for(let i=0; i<n_messages; i++) {
					let action = presetData.shift();
					let type = presetData.shift();
					let pos = presetData.shift();
					let values = [];
					for(let j=0; j<n_values; j++) {
						values[j] = presetData.shift();
					}
					setMessagesData (i, action, type, pos, values);
				}

				$('#save_preset_button, #save_bank_button').prop('disabled', false);
				
				break;
			// Bank Data
			case 2:
				bankName = intToAscii(presetData, 25);
				$('#bank_name').val(bankName);
				break;
			// Settings Data
			case 3:
				$('select[name="debounce-time"]').val(presetData.shift());
				$('select[name="lp-time"]').val(presetData.shift());
				$('select[name="bankname-time"]').val(presetData.shift());
				$('select[name="omni-port-conf-1"]').val(presetData.shift());
				$('select[name="omni-port-conf-2"]').val(presetData.shift());
				break;
		}
	} else {
		let codeName = '';
		switch(code) {
			case 192:
				codeName = 'Program Change';
				break;
			case 176:
				codeName = 'Control Change';
				break;
		}
		let tiempo = new Date().toISOString();
		let regex = /-/gi;
		tiempo = tiempo.replace('T', ' ');
		tiempo = tiempo.replace('Z', '');
		tiempo = tiempo.replace(regex, '/');
		
		let data1 = presetData.shift();
		let data2 = null;
		if (presetData.length != 0) {
			data2 = presetData.shift();
		}
		let trElement = $('<tr/>', {'class': 'table-dark'});
		trElement.append($('<td/>', {'text': tiempo}));
		trElement.append($('<td/>', {'text': midiMessage.target.manufacturer}));
		trElement.append($('<td/>', {'text': codeName}));
		trElement.append($('<td/>', {'text': data1}));
		trElement.append($('<td/>', {'text': data2}));
		trElement.append($('<td/>', {'text': midiChannel}));

		$('#midi-monitor-table').find('tbody').prepend(trElement);
	}
	
	presetData.length = 0;
}

function onMIDIFailure() {
    console.log('Could not access your MIDI devices.');
}

function PadLeft(value, length) {
    return (value.toString().length < length) ? PadLeft("0" + value, length) : 
    value;
}

function validateSubopt(elem)
{
	switch (elem.prop('name')) {
		case 'pcnumber':
		case 'ccnumber':
		case 'ccvalue':
			validateRange (elem, 0, 127);
			break;
		case 'midichannel':
			validateRange (elem, 1, 16);
			break;
		case 'bank-number':
			validateRange (elem, 1, n_banks);
	}
}

function validateRange (elem, min, max)
{
	if (elem.val() < min || elem.val() > max) {
		if (elem.hasClass('is-valid')) {
			elem.removeClass('is-valid');
			elem.addClass('is-invalid');
			$('#save_preset_button').prop('disabled', true);
		}
		
	} else {
		if (elem.hasClass('is-invalid')) {
			elem.removeClass('is-invalid');
			elem.addClass('is-valid');
			if ($('.is-invalid').length == 0) {
				$('#save_preset_button').prop('disabled', false);
			}
			
		}
	}
}

// sends bytes to device
function sendBytes(bytes)
{
    var bytes_to_send = new Uint8Array(bytes);
    console.log(bytes_to_send);

	midiOut.send(bytes_to_send);
}

function sendPresetRequest()
{
	var final_hex = [];
	final_hex.push(240);
	final_hex.push(3);
	final_hex.push(0);
	final_hex.push(247);
	sendBytes(final_hex);
}

function sendBankRequest()
{
	var final_hex = [];
	final_hex.push(240);
	final_hex.push(4);
	final_hex.push(0);
	final_hex.push(247);
	sendBytes(final_hex);
}

function sendSettingsRequest()
{
	var final_hex = [];
	final_hex.push(240);
	final_hex.push(5);
	final_hex.push(0);
	final_hex.push(247);
	sendBytes(final_hex);
}

function sendMIDIMonitorRequest()
{
	var final_hex = [];
	final_hex.push(240);
	final_hex.push(7);
	final_hex.push(0);
	final_hex.push(247);
	sendBytes(final_hex);
}

function setMessagesData (i, action, type, pos, values)
{
	let msg = $('div.msg').eq(i);
	msg.find('select[name="action"]').val(action);
	checkSelect(msg.find('select[name="action"]'));
	msg.find('select[name="type"]').val(type);
	checkSelect(msg.find('select[name="type"]'));
	msg.find('a.pos-button').data('pos', pos);
	if (pos == 2) {
		msg.find('a.pos-button').text('Pos: Both');
	} else {
		msg.find('a.pos-button').text('Pos: ' + (pos+1));
	}
	switchType(msg, type, values);
}

function switchType(msg, type, values = [])
{
	msg.find('div.row').first().siblings().hide();
	let div_subopt = msg.find('div.subopt-' + type);
	div_subopt.show();

	if (values.length == 0) {
		return;
	}

	switch(String(type)) {
		// Program Change
		case "1":
			div_subopt.find('input[name="pcnumber"]').val(values[0]);
			div_subopt.find('input[name="midichannel"]').val(values[1]);
			break;
		// Control Change
		case "2":
			div_subopt.find('input[name="ccnumber"]').val(values[0]);
			div_subopt.find('input[name="ccvalue"]').val(values[1]);
			div_subopt.find('input[name="midichannel"]').val(values[2]);
			break;
		// Bank Up / Down
		case "10":
		case "11":
			div_subopt.find('select[name="page"]').val(values[0]);
			break;
		// Bank Jump
		case "13":
			div_subopt.find('input[name="bank-number"]').val(values[0]);
			div_subopt.find('select[name="page"]').val(values[1]);
			break;
		// Set Toggle Single / Long
		case "15":
		case "16":
			div_subopt.find('select[name="toggle-position"]').val(values[0]);
			let num = values[1];
			for (let i=0; i<7; i++) {
				if (((num >> i) & 0x01) == 1) {
					div_subopt.find('input[name="inlineCheckbox'+i+'"]').val(1);
					div_subopt.find('input[name="inlineCheckbox'+i+'"]').prop('checked', true);
				}
			}
			num = values[2];
			for (let i=7; i<14; i++) {
				if (((num >> (i-7)) & 0x01) == 1) {
					div_subopt.find('input[name="inlineCheckbox'+i+'"]').val(1);
					div_subopt.find('input[name="inlineCheckbox'+i+'"]').prop('checked', true);
				}
			}
			num = values[3];
			for (let i=14; i<16; i++) {
				if (((num >> (i-14)) & 0x01) == 1) {
					div_subopt.find('input[name="inlineCheckbox'+i+'"]').val(1);
					div_subopt.find('input[name="inlineCheckbox'+i+'"]').prop('checked', true);
				}
			}
			break;
		// Delay
		case "23":
			div_subopt.find('select[name="delay"]').val(values[0]);
			break;
		default:
			div_subopt.find('input').each(function(index) {
				$(this).val(values[index]);
				validateSubopt($(this));
			});
			break;
	}
}

function checkSelect(elem)
{
	if (elem.val() == '0') {
		elem.prev().find('span').css({color: 'white'});
	} else {
		elem.prev().find('span').css({color: 'lawngreen'});
	}
	checkMsgGreen(elem.closest('div.msg'));
}

function checkMsgGreen(msg)
{
	elems = msg.find('span.input-group-text');
	let n_green = 0;
	elems.each(function() {
		if ($(this).css('color') == 'rgb(124, 252, 0)') {
			n_green++;
		}
	});

	if (n_green == 2) {
		msg.find('button').first().css({color: 'lawngreen'});
		msg.addClass('msg-ok');
	} else {
		msg.find('button').first().css({color: 'white'});
		msg.removeClass('msg-ok');
	}
}

function intToAscii(presetData, numChars)
{
	var str = '';
	for (let i = 0; i < numChars; i++) {
		let decData = presetData.shift();
		if (decData != 0) {
			str += String.fromCharCode(decData);
		}
	}
	return str;
}

function stringToAscii(arr, str, numChars)
{
	for (let i = 0; i < numChars; i++) {
		if (str[i] != undefined) {
			arr.push(str[i].charCodeAt(0));
		} else {
			arr.push(0);
		}
		
	}
}


// ***********************
// ******** Main *********
// ***********************

var presetsName = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P'];
var midiAccess=null;

var n_messages = 8;
var n_presets = 8;
var n_banks = 12;
var n_values = 4;
var incoming = [];

var bankNumber;
var pageNumber;
var buttonNumber;

$('#con_dis_button').on('click', function() {
	if ($('#con_dis_button').hasClass('btn-primary')) {
		connect();
	} else {
        $('#con_dis_button').removeClass('btn-success');
        $('#con_dis_button').addClass('btn-primary');
	}
	
});

$('#preset_type_button').on('click', function() {
	if ($(this).data('preset-type') == '0') {
		$(this).data('preset-type', '1');
		$(this).text('Preset Type: Effect');
	} else {
		$(this).data('preset-type', '0');
		$(this).text('Preset Type: Preset');
	}
});

$('.toggle-mode-button').on('click', function() {
	if ($(this).data('toggle-mode') == '0') {
		$(this).data('toggle-mode', '1');
		$(this).text('Toggle Mode On');
		$(this).css({color: 'yellow'});
	} else {
		$(this).data('toggle-mode', '0');
		$(this).text('Toggle Mode Off');
		$(this).css({color: 'white'});
	}
});

$('#edit-tab').on('click', function() {
	sendPresetRequest();
});

$('#bank-tab').on('click', function() {
	sendBankRequest();
});

$('#settings-tab').on('click', function() {
	sendSettingsRequest();
});

$('#midi-monitor-tab').on('click', function() {
	$('#midi-monitor-table').find('tbody').empty();
	sendMIDIMonitorRequest();
});

$('#save_preset_button').on('click', function() {
	var final_hex = [];
	final_hex.push(240);
	final_hex.push(1);
	final_hex.push(bankNumber);
	final_hex.push(pageNumber);
	final_hex.push(buttonNumber);
	final_hex.push(parseInt($('#preset_type_button').data('preset-type')));
	stringToAscii(final_hex, $('#long_name').val(), 25);
	stringToAscii(final_hex, $('#p_short_name').val(), 9);
	stringToAscii(final_hex, $('#p_toggle_name').val(), 9);
	final_hex.push(parseInt($('.toggle-mode-button').eq(0).data('toggle-mode')));
	stringToAscii(final_hex, $('#lp_short_name').val(), 9);
	stringToAscii(final_hex, $('#lp_toggle_name').val(), 9);
	final_hex.push(parseInt($('.toggle-mode-button').eq(1).data('toggle-mode')));
	let color_val1 = $('#color1').val();
	final_hex.push(Math.floor(parseInt(color_val1.substring(1,3),16))/2);
	final_hex.push(Math.floor(parseInt(color_val1.substring(3,5),16))/2);
	final_hex.push(Math.floor(parseInt(color_val1.substring(5,7),16))/2);
	let color_val2 = $('#color2').val();
	final_hex.push(Math.floor(parseInt(color_val2.substring(1,3),16))/2);
	final_hex.push(Math.floor(parseInt(color_val2.substring(3,5),16))/2);
	final_hex.push(Math.floor(parseInt(color_val2.substring(5,7),16))/2);
	$('div.msg').each(function() {
		if ($(this).hasClass('msg-ok')) {
			final_hex.push(parseInt($(this).find('select[name="action"]').val()));
			let type = parseInt($(this).find('select[name="type"]').val());
			final_hex.push(type);
			final_hex.push(parseInt($(this).find('a').first().data('pos')));

			let div_subopt = $(this).find('div.subopt-' + type);
			switch(String(type)) {
				// Program Change
				case "1":
					final_hex.push(parseInt(div_subopt.find('input[name="pcnumber"]').val()));
					final_hex.push(parseInt(div_subopt.find('input[name="midichannel"]').val()));
					final_hex.push(0);
					final_hex.push(0);
					break;
				// Control Change
				case "2":
					final_hex.push(parseInt(div_subopt.find('input[name="ccnumber"]').val()));
					final_hex.push(parseInt(div_subopt.find('input[name="ccvalue"]').val()));
					final_hex.push(parseInt(div_subopt.find('input[name="midichannel"]').val()));
					final_hex.push(0);
					break;
				// Bank Up / Down
				case "10":
				case "11":
					final_hex.push(parseInt(div_subopt.find('select[name="page"]').val()));
					final_hex.push(0);
					final_hex.push(0);
					final_hex.push(0);
					break;
				// Bank Jump
				case "13":
					final_hex.push(parseInt(div_subopt.find('input[name="bank-number"]').val()));
					final_hex.push(parseInt(div_subopt.find('select[name="page"]').val()));
					final_hex.push(0);
					final_hex.push(0);
					break;
				// Set Toggle Single / Long
				case "15":
				case "16":
					final_hex.push(parseInt(div_subopt.find('select[name="toggle-position"]').val()));
					let num = 0;
					for (let i=0; i<7; i++) {
						if (div_subopt.find('input[name="inlineCheckbox'+i+'"]').val() == 1) {
							num |= 1 << i;
						}
					}
					final_hex.push(num);
					num = 0;
					for (let i=7; i<14; i++) {
						if (div_subopt.find('input[name="inlineCheckbox'+i+'"]').val() == 1) {
							num |= 1 << (i-7);
						}
					}
					final_hex.push(num);
					num = 0;
					for (let i=14; i<16; i++) {
						if (div_subopt.find('input[name="inlineCheckbox'+i+'"]').val() == 1) {
							num |= 1 << (i-14);
						}
					}
					final_hex.push(num);
					break;
				// Delay
				case "23":
					final_hex.push(parseInt(div_subopt.find('select[name="delay"]').val()));
					final_hex.push(0);
					final_hex.push(0);
					final_hex.push(0);
					break;
				default:
					for (let i=0; i < n_values; i++) {
						final_hex.push(0);
					}
					break;
			}
		} else {
			for (let i=0; i < (3 + n_values); i++) {
				final_hex.push(0);
			}
		}
	});

	final_hex.push(247);
	sendBytes(final_hex);
});

$('#save_bank_button').on('click', function() {
	var final_hex = [];
	final_hex.push(240);
	final_hex.push(2);
	final_hex.push(bankNumber);
	stringToAscii(final_hex, $('#bank_name').val(), 25);
	final_hex.push(247);
	sendBytes(final_hex);
});

$('#save_settings_button').on('click', function() {
	var final_hex = [];
	final_hex.push(240);
	final_hex.push(6);
	final_hex.push($('select[name="debounce-time"]').val());
	final_hex.push($('select[name="lp-time"]').val());
	final_hex.push($('select[name="bankname-time"]').val());
	final_hex.push($('select[name="omni-port-conf-1"]').val());
	final_hex.push($('select[name="omni-port-conf-2"]').val());
	final_hex.push(247);
	sendBytes(final_hex);
});


$(document).ready(function() {
	$('[data-toggle="tooltip"]').tooltip();
	let div_msg = $('div.msg')
	let div_duplicate = div_msg.parent();

	for (let i=0; i < (n_messages-1); i++) {
		let div_clone = div_msg.clone()
		div_clone.find('button').first().text('Msg ' + (i+2));
		div_clone.appendTo(div_duplicate);
	}
	
	$('select[name="action"]').on('change', function() {
		if ($(this).val() == '9') {
			$(this).closest('div.msg').find('.pos-button').data('pos', 2);
				$(this).closest('div.msg').find('.pos-button').text('Pos: Both');;
		}
		checkSelect($(this));
	});

	$('input[type="checkbox"]').on('click', function() {
		if ($(this).prop('checked')) {
			$(this).val('1');
		} else {
			$(this).val('0');
		}
	});

	$('select[name="type"]').on('change', function() {
		switchType($(this).closest('div.msg'), $(this).val());
		checkSelect($(this));
	});

	$('div.subopt').find('input').on('change', function() {
		validateSubopt($(this));
	});

	$('.clear-button').on('click', function() {
		let msg = $(this).closest('div.msg');
		msg.find('form')[0].reset();
		msg.find('button').first().css({color: 'white'});
		msg.removeClass('msg-ok');
		msg.find('div.row').first().siblings().hide();
		msg.find('span').css({color: 'white'});
		msg.find('a.pos-button').data('pos', 0);
		msg.find('a.pos-button').text('Pos: 1');
	});

	$('a.pos-button').on('click', function() {
		if ($(this).closest('div.msg').find('select[name="action"]').val() == '9') {
			return;
		}
		switch (String($(this).data('pos'))) {
			case '0':
				$(this).data('pos', 1);
				$(this).text('Pos: 2');
				break;
			case '1':
				$(this).data('pos', 2);
				$(this).text('Pos: Both');
				break;
			case '2':
				$(this).data('pos', 0);
				$(this).text('Pos: 1');
				break;
		}
		
	});

	//searchTeensy();
});
