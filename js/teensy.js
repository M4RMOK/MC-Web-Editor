// ***********************
// ****** Functions ******
// ***********************


function connect() {
    if (navigator.requestMIDIAccess)
        navigator.requestMIDIAccess({sysex: true}).then( onMIDISuccess, onMIDIFailure );
    else
        alert("No MIDI support present in your browser.");
}

function disconnect() {
    var final_hex = [];
	final_hex.push(19);
	final_hex.push(0);
	sendSysEx(final_hex);
}

function onMIDISuccess(midi) {
   // Reset.
   console.log(midi.inputs.values());
    midiIn = null;
    midiOut = null;
    midiAccess = midi;

    midiInputOk = false;
    midiOutputOk = false;

    // MIDI devices that send you data.
    for (var input of midiAccess.inputs.values()) {
    	console.log(input);
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
        isConnected = true;
        sendEditModeRequest();
        sendPresetRequest();
    } else {
        alert("No Teensy MIDI found.");
    }
}


function midiMessageReceived(midiMessage) {
	if (!isConnected) {
		return;
	}
	console.log(midiMessage);
	presetData = [].slice.call(midiMessage.data);
	let allCode = presetData.shift();
	let code = allCode&240;
	let midiChannel = (allCode&15)+1;

	if (code == 240) { // Initial Sysex code 0xF0
		presetData.unshift(240);
		if (!checkCRC(0,1,presetData)) {
			alert('Checksum no válido');
			return;
		}
		presetData.shift();
		if (presetData[0] == 0x00 && presetData[1] == 0x01 && presetData[2] == 0x74 && presetData[3] == 0x11) {
			showMidiMonitor(midiMessage, midiChannel, code, presetData);
			presetData.length = 0;
			return;
		}

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
				$('#preset_number').prev().text('PRESET');
				$('#page_number').text(pageNumber);
				$('#preset_number').text(presetsName[buttonNumber-1]);
				if (!midiMonitor) {
					$('#edit-tab').tab('show');
				}
				
				expNumber = undefined;

				// Preset data
				let presetConf = presetData.shift();
				//console.log(presetConf);
				//return;
				let pToggleMode = (presetConf >> 5) & 0x01;
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
				let lpToogleModeButton = $('.toggle-mode-button').eq(1);
				let lpToggleMode = (presetConf >> 6) & 0x01;
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
				let spPresetType = presetConf & 0x03;
				if (spPresetType == 0) {
					$('#preset_type_button_sp').data('preset-type', '0');
					$('#preset_type_button_sp').text('Type: Normal');
				} else if (spPresetType == 1) {
					$('#preset_type_button_sp').data('preset-type', '1');
					$('#preset_type_button_sp').text('Type: Preset');
				} else if (spPresetType == 2) {
					$('#preset_type_button_sp').data('preset-type', '2');
					$('#preset_type_button_sp').text('Type: Tempo');
				} else {
					$('#preset_type_button_sp').text('¡Error!');
				}
				let lpPresetType = (presetConf >> 2) & 0x03;
				if (lpPresetType == 0) {
					$('#preset_type_button_lp').data('preset-type', '0');
					$('#preset_type_button_lp').text('Type: Normal');
				} else if (lpPresetType == 1) {
					$('#preset_type_button_lp').data('preset-type', '1');
					$('#preset_type_button_lp').text('Type: Preset');
				} else if (spPresetType == 2) {
					$('#preset_type_button_lp').data('preset-type', '2');
					$('#preset_type_button_lp').text('Type: Tempo');
				} else {
					$('#preset_type_button_lp').text('¡Error!');
				}
				let longName = intToAscii(presetData, 25);
				$('#long_name').val(longName);
				let pShortName = intToAscii(presetData, 9);
				$('#p_short_name').val(pShortName);
				let pToggleName = intToAscii(presetData, 9);
				$('#p_toggle_name').val(pToggleName);
				
				let lpShortName = intToAscii(presetData, 9);
				$('#lp_short_name').val(lpShortName);
				let lpToggleName = intToAscii(presetData, 9);
				$('#lp_toggle_name').val(lpToggleName);

				let spColorVal = presetData.shift();
				spRingColor = parseInt('111111', 2)&spColorVal;
				spColorType = (spColorVal >> 6) & 0x01;

				$('#color-sp').val(spRingColor);
				$('label.color-label').eq(spRingColor).trigger('click');
				$('#color-type-sp').val(spColorType);

				let lpColorVal = presetData.shift();
				lpRingColor = parseInt('111111', 2)&lpColorVal;
				lpColorType = (lpColorVal >> 6) & 0x01;

				$('#color-lp').val(lpRingColor);
				$('label.color-label-lp').eq(lpRingColor).trigger('click');
				$('#color-type-lp').val(lpColorType);

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

				$('#save_preset_button').prop('disabled', false);
				expNumber = undefined;
				
				break;
			// Bank Data
			case 2:
				bankName = intToAscii(presetData, 25);
				$('#bank_name').val(bankName);
				$('#save_bank_button').prop('disabled', false);
				break;
			// Settings Data
			case 3:
				$('select[name="debounce-time"]').val(presetData.shift());
				$('select[name="lp-time"]').val(presetData.shift());
				$('select[name="notification-time"]').val(presetData.shift());
				$('select[name="ring-bright"]').val(presetData.shift());
				$('select[name="ring-dim"]').val(presetData.shift());
				$('select[name="all-bright"]').val(presetData.shift());
				$('select[name="omni-port-conf-1"]').val(presetData.shift());
				$('select[name="omni-port-conf-2"]').val(presetData.shift());
				$('select[name="req-fm3-scenes"]').val(presetData.shift());
				break;
			// Pedal Expression Data
			case 9:
				if (midiMonitor) {
					return;
				}
				let bankNumberTemp = presetData.shift();
				let expNumberTemp = presetData.shift();
				if (expNumber != expNumberTemp) {
					expNumber = expNumberTemp;
					bankNumber = bankNumberTemp;
					$('#bank_number').text(bankNumber);
					$('#preset_number').prev().text('EXPRESSION');
					$('#preset_number').text(expNumber+1);
					$('#exp-pedal-tab').tab('show');
					let shortName = intToAscii(presetData, 9);
					$('#exp_short_name').val(shortName);
					// Messages data
					for(let i=0; i<n_messages; i++) {
						let type = presetData.shift();
						let values = [];
						for(let j=0; j<n_values; j++) {
							values[j] = presetData.shift();
						}
						setExpMessagesData(i, type, values);
					}
				}

				$('#save_exp_button').prop('disabled', false);
				break;
			// Backup Current Bank Data
			case 10:
				let bankNumberBackup = presetData.shift();
				presetData.pop(); // 247, End of SysEx
				presetData.pop(); // Checksum
				console.log(presetData);
				presetData.unshift(240);
				presetData.push(247);
				let presetDataInt8 = new Uint8Array(presetData);
				if (presetDataInt8.length != (bank_length + 2)) {
					alert('Datos no válidos');
					return;
				}
				var blob = new Blob([presetDataInt8], {type: "application/octet-stream"});
				saveAs(blob, "AfterMoon_MC8_Backup_file_Bank" + bankNumberBackup + ".syx");
				break;
			// Backup Restore Bank Data
			case 11:
				var final_hex = [];
				let ra_cont = presetData.shift();

				if (restore_array.length <= (file_div_size+ (file_div_size*ra_cont))) {
					final_hex = restore_array.slice((file_div_size*ra_cont));
				} else {
					final_hex = restore_array.slice((file_div_size*ra_cont), file_div_size+ (file_div_size*ra_cont));
				}
				
				final_hex.unshift(ra_cont);
				final_hex.unshift(11);
				sendSysEx(final_hex);
				break;
			// Backup All Banks Data
			case 12:
				presetData.pop(); // 247, End of SysEx
				presetData.pop(); // Checksum
				console.log(presetData);
				let bank_cont = presetData.shift();
				if (bank_cont < n_banks) {
					bank_rx_array = bank_rx_array.concat(presetData);
					var final_hex = [];
					final_hex.push(12);
					final_hex.push(bank_cont + 1);

					sendSysEx(final_hex);
				} else {
					
					presetData.push(247);
					bank_rx_array = bank_rx_array.concat(presetData);
					let bankAllDataInt8 = new Uint8Array(bank_rx_array);
					if (bankAllDataInt8.length != ((bank_length * n_banks) + 2)) {
						alert('Datos no válidos');
						return;
					}
					var blob = new Blob([bankAllDataInt8], {type: "application/octet-stream"});
					saveAs(blob, "AfterMoon_MC8_Backup_file_All_Banks.syx");
				}
				break;
			// Backup Restore All Banks Data First Time
			case 13:
				var final_hex = [];
				all_banks_cont = 1;
				final_hex = restore_array.slice((file_div_size*all_banks_cont), file_div_size + (file_div_size*all_banks_cont));

				final_hex.unshift(14);
				sendSysEx(final_hex);
				break;
			// Backup Restore All Banks Data X Times
			case 14:
				var final_hex = [];
				all_banks_cont += 1;
				if (restore_array.length <= (file_div_size + (file_div_size*all_banks_cont))) {
					final_hex = restore_array.slice((file_div_size*all_banks_cont));
				} else {
					final_hex = restore_array.slice((file_div_size*all_banks_cont), file_div_size + (file_div_size*all_banks_cont));
				}
				
				final_hex.unshift(14);
				sendSysEx(final_hex);
				break;
		}
	// MIDI Monitor
	} else {
		showMidiMonitor(midiMessage, midiChannel, code, presetData);
	}
	
	presetData.length = 0;
}

function showMidiMonitor(midiMessage, midiChannel, code, presetData) {
	let codeName = '';
	let data1 = '-';
	let data2 = '-';
	if (presetData[0] == 0x00 && presetData[1] == 0x01 && presetData[2] == 0x74 && presetData[3] == 0x11) {
		midiChannel = '-';
		switch(presetData[4]) {
			case 0x0A:
				if (presetData[7] == 0x7F) {
					codeName = 'FM3 Get Bypass';
				} else {
					codeName = 'FM3 Set Bypass';
					data1 = presetData[5];
					data2 = presetData[6];
					midiChannel = presetData[7];
				}
				break;
			case 0x0B:
				if (presetData[7] == 0x7F) {
					codeName = 'FM3 Get Channel';
				} else {
					codeName = 'FM3 Set Channel';
					data1 = presetData[5];
					data2 = presetData[6];
					midiChannel = presetData[7];
				}
				break;
			case 0x0C:
				if (presetData[5] == 0x7F) {
					codeName = 'FM3 Get Scene';
				} else {
					codeName = 'FM3 Set Scene';
					data1 = presetData[5];
				}
				break;
			case 0x0D:
				codeName = 'FM3 Query Patch Name';
				data1 = presetData[5];
				data2 = presetData[6];
				break;
			case 0x0E:
				codeName = 'FM3 Query Scene Name';
				data1 = presetData[5];
				break;
			case 0x0F:
				if (presetData[5] == 0x7F) {
					codeName = 'FM3 Get Looper State';
				} else {
					codeName = 'FM3 Set Looper State';
					data1 = presetData[5];
				}
				break;
			case 0x10:
				codeName = 'FM3 Tap Tempo';
				break;
			case 0x11:
				codeName = 'FM3 Tuner';
				data1 = presetData[5];
				break;
			case 0x13:
				codeName = 'FM3 Status Dump';
				break;
			case 0x14:
				if (presetData[5] == 0x7F && presetData[6] == 0x7F) {
					codeName = 'FM3 Get Tempo';
				} else {
					codeName = 'FM3 Set Tempo';
					data1 = presetData[5];
					data2 = presetData[6];
				}
				break;
		}
	} else {
		switch(code) {
			case 192:
				codeName = 'Program Change';
				break;
			case 176:
				codeName = 'Control Change';
				break;
		}
		data1 = presetData.shift();
		if (presetData.length != 0) {
			data2 = presetData.shift();
		}
	}

	if (codeName == '') {
		return;
	}
	
	let tiemp = new Date();
	let tiempo = tiemp.toISOString();
	let hour = tiemp.getHours();
	let regex = /-/gi;
	tiempo = tiempo.replace('T', ' ');
	tiempo = tiempo.replace('Z', '');
	tiempo = tiempo.replace(regex, '/');
	let tiempo1 = tiempo.slice(0,11);
	let tiempo2 = tiempo.slice(13);
	
	let trElement = $('<tr/>', {'class': 'table-dark'});
	trElement.append($('<td/>', {'text': tiempo1+hour+tiempo2}));
	trElement.append($('<td/>', {'text': midiMessage.target.manufacturer}));
	trElement.append($('<td/>', {'text': codeName}));
	trElement.append($('<td/>', {'text': data1}));
	trElement.append($('<td/>', {'text': data2}));
	trElement.append($('<td/>', {'text': midiChannel}));

	$('#midi-monitor-table').find('tbody').prepend(trElement);
}


function checkCRC(inicio, final, datos) {
	let copiaDatos = datos.slice(0);
	for (let i = 0; i < inicio; i++) {
		copiaDatos.shift();
	}
	for (let i = 0; i < final; i++) {
		copiaDatos.pop();
	}
	var checksumOrigin = copiaDatos.pop();
	var checksum = chk8xor(copiaDatos);
	//console.log('Checksum Origin: ' + checksumOrigin);
	//console.log('Checksum : ' + checksum);
	return (checksumOrigin == checksum);
}

function chk8xor(byteArray) {
	let checksum = 0x00;
	for(let i = 0; i < byteArray.length; i++) {
		checksum ^= byteArray[i];
	}

	return checksum&0x7F;
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
		case 'ccminvalue':
		case 'ccmaxvalue':
			validateRange (elem, 0, 127);
			break;
		case 'midichannel':
			validateRange (elem, 1, 16);
			break;
		case 'bank-number':
			validateRange (elem, 1, n_banks);
			break;
		case 'fm3pcnumber':
			validateRange (elem, 0, 511);
			break;
		case 'bpm':
			validateRange (elem, 24, 250);
			break;
	}
}

function validateRange (elem, min, max)
{
	if (elem.val() < min || elem.val() > max) {
		if (elem.hasClass('is-valid')) {
			elem.removeClass('is-valid');
			elem.addClass('is-invalid');
			if (expNumber == undefined) {
				$('#save_preset_button').prop('disabled', true);
			} else {
				$('#save_exp_button').prop('disabled', true);
			}
		}
		
	} else {
		if (elem.hasClass('is-invalid')) {
			elem.removeClass('is-invalid');
			elem.addClass('is-valid');
			if ($('.is-invalid').length == 0) {
				if (expNumber == undefined) {
					$('#save_preset_button').prop('disabled', false);
				} else {
					$('#save_exp_button').prop('disabled', false);
				}
			}
			
		}
	}
}

// sends bytes to device
function sendSysEx(bytes)
{
	if (!isConnected) {
		return;
	}
	bytes.unshift(240);
	let checksum = chk8xor(bytes);
	bytes.push(checksum);
	bytes.push(247);

	var bytes_to_send = new Uint8Array(bytes);
	console.log(bytes_to_send);

	midiOut.send(bytes_to_send);
}

function sendEditModeRequest()
{
	var final_hex = [];
	final_hex.push(8);
	final_hex.push(0);
	sendSysEx(final_hex);
}

function sendPresetRequest()
{
	var final_hex = [];
	final_hex.push(3);
	final_hex.push(0);
	sendSysEx(final_hex);
}

function sendBankRequest()
{
	var final_hex = [];
	final_hex.push(4);
	final_hex.push(0);
	sendSysEx(final_hex);
}

function sendSettingsRequest()
{
	var final_hex = [];
	final_hex.push(5);
	final_hex.push(0);
	sendSysEx(final_hex);
}

function sendMIDIMonitorRequest()
{
	var final_hex = [];
	final_hex.push(7);
	final_hex.push(0);
	sendSysEx(final_hex);
}

function sendTogglePage()
{
	var final_hex = [];
	final_hex.push(16);
	final_hex.push(0);
	sendSysEx(final_hex);
}

function sendBankDown()
{
	var final_hex = [];
	final_hex.push(17);
	final_hex.push(0);
	sendSysEx(final_hex);
}

function sendBankUp()
{
	var final_hex = [];
	final_hex.push(18);
	final_hex.push(0);
	sendSysEx(final_hex);
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

function setExpMessagesData (i, type, values)
{
	let msg = $('div.exp-msg').eq(i);
	msg.find('select[name="exp-type"]').val(type);
	checkExpSelect(msg.find('select[name="exp-type"]'));
	switchExpType(msg, type, values);
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
		// Midi Clock
		case "7":
			let BPMSec = values[1];
			let BPM = (BPMSec << 7) + values[0];
			div_subopt.find('input[name="bpm"]').val(BPM);
			break;
		// Bank Up / Down
		case "10":
		case "11":
			div_subopt.find('select[name="page"]').val(values[0]);
			break;
		// Bank Jump
		case "13":
			if(values[0] == 127) {
				div_subopt.find('select[name="last-used-bank"]').val(1);
				div_subopt.find('input[name="bank-number"]').parent().parent().css({visibility: 'hidden'});
				div_subopt.find('input[name="bank-number"]').value = '1';

			} else {
				div_subopt.find('select[name="last-used-bank"]').val(0);
				div_subopt.find('input[name="bank-number"]').parent().parent().css({visibility: 'visible'});
				div_subopt.find('input[name="bank-number"]').val(values[0]);
			}
			div_subopt.find('select[name="page"]').val(values[1]);
			break;
		// Set Toggle Single / Long
		case "15":
		case "16":
			let firstNum = values[0] & 3;
			let secondNum = values[0] >> 2;
			div_subopt.find('select[name="toggle-position"]').val(firstNum);
			div_subopt.find('select[name="toggle-bank-number"]').val(secondNum);

			// div_subopt.find('select[name="toggle-position"]').val(values[0]);
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
		// FM3 Tuner
		case "21":
			div_subopt.find('select[name="fm3-tuner"]').val(values[0]);
			break;
		// Delay
		case "23":
			div_subopt.find('select[name="delay"]').val(values[0]);
			break;
		// FM3 Preset Change
		case "25":
			let fm3IDSec = values[1];
			let fm3ID = (fm3IDSec << 7) + values[0];
			div_subopt.find('input[name="fm3pcnumber"]').val(fm3ID);
			div_subopt.find('input[name="midichannel"]').val(values[2]);
			break;
		// FM3 Effect
		case "26":
			div_subopt.find('select[name="effect"]').val(values[0]);
			break;
		// FM3 Scene
		case "27":
			div_subopt.find('select[name="scene"]').val(values[0]);
			break;
		// FM3 Channel
		case "28":
			div_subopt.find('select[name="effect"]').val(values[0]);
			div_subopt.find('select[name="channel"]').val(values[1]);
			break;
		default:
			div_subopt.find('input').each(function(index) {
				$(this).val(values[index]);
				validateSubopt($(this));
			});
			break;
	}
}

function switchExpType(msg, type, values = [])
{
	msg.find('div.row').first().siblings().hide();
	let div_subopt = msg.find('div.subopt-' + type);
	div_subopt.show();

	if (values.length == 0) {
		return;
	}

	switch(String(type)) {
		// Expression CC
		case "1":
			div_subopt.find('input[name="ccnumber"]').val(values[0]);
			div_subopt.find('input[name="ccminvalue"]').val(values[1]);
			div_subopt.find('input[name="ccmaxvalue"]').val(values[2]);
			div_subopt.find('input[name="midichannel"]').val(values[3]);
			break;
		// CC Down
		case "2":
			div_subopt.find('input[name="ccnumber"]').val(values[0]);
			div_subopt.find('input[name="ccvalue"]').val(values[1]);
			div_subopt.find('input[name="midichannel"]').val(values[2]);
			break;
		// CC Up
		case "3":
			div_subopt.find('input[name="ccnumber"]').val(values[0]);
			div_subopt.find('input[name="ccvalue"]').val(values[1]);
			div_subopt.find('input[name="midichannel"]').val(values[2]);
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

function checkExpSelect(elem)
{
	if (elem.val() == '0') {
		elem.prev().find('span').css({color: 'white'});
	} else {
		elem.prev().find('span').css({color: 'lawngreen'});
	}
	checkExpMsgGreen(elem.closest('div.exp-msg'));
}

function checkExpMsgGreen(msg)
{
	elems = msg.find('span.input-group-text');
	let n_green = 0;
	elems.each(function() {
		if ($(this).css('color') == 'rgb(124, 252, 0)') {
			n_green++;
		}
	});

	if (n_green == 1) {
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

var presetsName = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
var midiAccess=null;

var n_messages = 8;
var n_presets = 8;
var n_banks = 20;
var n_values = 4;
var bank_length = 2043;
var file_div_size = 200;
var all_banks_cont = 0;
var incoming = [];
var restore_array = [];
var bank_rx_array = [];

var bankNumber;
var pageNumber;
var buttonNumber;
var expNumber;
var midiMonitor;
var isConnected = false;

var myCopy;

$('#con_dis_button').on('click', function() {
	if ($('#con_dis_button').hasClass('btn-primary')) {
		connect();
	} else {
		disconnect();
		isConnected = false;
        $('#con_dis_button').removeClass('btn-success');
        $('#con_dis_button').addClass('btn-primary');
        $('#con_dis_button').text('Click to connect');
	}
	
});

$('#preset_type_button_sp, #preset_type_button_lp').on('click', function() {
	switch($(this).data('preset-type').toString()) {
		case '0':
			$(this).data('preset-type', '1');
			$(this).text('Type: Preset');
			break;
		case '1':
			$(this).data('preset-type', '2');
			$(this).text('Type: Tempo');
			break;
		default:
			$(this).data('preset-type', '0');
			$(this).text('Type: Normal');
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

$('#edit-tab').on('click', function(e) {
	expNumber = undefined;
	$('#preset_number').prev().text('PRESET');
	if (pageNumber == 1 || pageNumber == 2) {
		$('#page_number').text(pageNumber);
		$('#preset_number').text(presetsName[buttonNumber-1]);
	} else {
		$('#bank_number').text('-');
		$('#page_number').text('-');
		$('#preset_number').text('-');
	}
	midiMonitor = undefined;
	//sendPresetRequest();
});

$('#bank-tab').on('click', function() {
	midiMonitor = undefined;
	sendBankRequest();
});

$('#settings-tab').on('click', function() {
	midiMonitor = undefined;
	sendSettingsRequest();
});

$('#midi-monitor-tab').on('click', function() {
	$('#midi-monitor-table').find('tbody').empty();
	midiMonitor = true;
	sendMIDIMonitorRequest();
});

$('#toggle_page_button').on('click', function() {
	sendTogglePage();
});

$('#bank_down_button').on('click', function() {
	sendBankDown();
});

$('#bank_up_button').on('click', function() {
	sendBankUp();
});

$('label.color-label').on('click', function() {
	$('label.color-label').css({'border-color': 'transparent'});
	$(this).css({'border-color': 'white'});
	$('#color-sp').val($(this).index());
});

$('label.color-label-lp').on('click', function() {
	$('label.color-label-lp').css({'border-color': 'transparent'});
	$(this).css({'border-color': 'white'});
	$('#color-lp').val($(this).index());
});

$('#save_preset_button').on('click', function() {
	var final_hex = [];
	final_hex.push(1);
	final_hex.push(bankNumber);
	final_hex.push(pageNumber);
	final_hex.push(buttonNumber);
	let presetConf = parseInt($('#preset_type_button_sp').data('preset-type'));
	presetConf |= $('#preset_type_button_lp').data('preset-type') << 2;
	if ($('.toggle-mode-button').eq(0).data('toggle-mode') == '1') {
		presetConf |= 1 << 5;
	}
	if ($('.toggle-mode-button').eq(1).data('toggle-mode') == '1') {
		presetConf |= 1 << 6;
	}
	final_hex.push(presetConf);
	stringToAscii(final_hex, $('#long_name').val(), 25);
	stringToAscii(final_hex, $('#p_short_name').val(), 9);
	stringToAscii(final_hex, $('#p_toggle_name').val(), 9);
	stringToAscii(final_hex, $('#lp_short_name').val(), 9);
	stringToAscii(final_hex, $('#lp_toggle_name').val(), 9);
	let color_val = (parseInt($('#color-sp').val()) + ($('#color-type-sp').val()*64));
	final_hex.push(color_val);
	let lp_color_val = (parseInt($('#color-lp').val()) + ($('#color-type-lp').val()*64));
	final_hex.push(lp_color_val);
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
				// Midi Clock
				case "7":
					let BPMID = parseInt(div_subopt.find('input[name="bpm"]').val());
					final_hex.push(BPMID&0x7F);
					final_hex.push(BPMID >> 7);
					final_hex.push(0);
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
					if (div_subopt.find('select[name="last-used-bank"]').val() == '1') {
						final_hex.push(127);
					} else {
						final_hex.push(parseInt(div_subopt.find('input[name="bank-number"]').val()));
					}
					final_hex.push(parseInt(div_subopt.find('select[name="page"]').val()));
					final_hex.push(0);
					final_hex.push(0);
					break;
				// Set Toggle Single / Long
				case "15":
				case "16":
					let firstNum = parseInt(div_subopt.find('select[name="toggle-position"]').val());
					let secondNum = parseInt(div_subopt.find('select[name="toggle-bank-number"]').val()) << 2;
					final_hex.push(firstNum + secondNum);

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
				// FM3 Tuner
				case "21":
					final_hex.push(parseInt(div_subopt.find('select[name="fm3-tuner"]').val()));
					final_hex.push(0);
					final_hex.push(0);
					final_hex.push(0);
					break;
				// Delay
				case "23":
					final_hex.push(parseInt(div_subopt.find('select[name="delay"]').val()));
					final_hex.push(0);
					final_hex.push(0);
					final_hex.push(0);
					break;
				// FM3 Preset Change
				case "25":
					let fm3PCID = parseInt(div_subopt.find('input[name="fm3pcnumber"]').val());
					final_hex.push(fm3PCID&0x7F);
					final_hex.push(fm3PCID >> 7);
					final_hex.push(parseInt(div_subopt.find('input[name="midichannel"]').val()));
					final_hex.push(0);
					break;
				// FM3 Effect
				case "26":
					final_hex.push(parseInt(div_subopt.find('select[name="effect"]').val()));
					final_hex.push(0);
					final_hex.push(0);
					final_hex.push(0);
					break;
				// FM3 Scene
				case "27":
					final_hex.push(parseInt(div_subopt.find('select[name="scene"]').val()));
					final_hex.push(0);
					final_hex.push(0);
					final_hex.push(0);
					break;
				// FM3 Channel
				case "28":
					final_hex.push(parseInt(div_subopt.find('select[name="effect"]').val()));
					final_hex.push(parseInt(div_subopt.find('select[name="channel"]').val()));
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

	sendSysEx(final_hex);
});

$('#save_exp_button').on('click', function() {
	var final_hex = [];
	final_hex.push(9);
	final_hex.push(bankNumber);
	final_hex.push(expNumber);

	stringToAscii(final_hex, $('#exp_short_name').val(), 9);

	$('div.exp-msg').each(function() {
		if ($(this).hasClass('msg-ok')) {
			let type = parseInt($(this).find('select[name="exp-type"]').val());
			final_hex.push(type);

			let div_subopt = $(this).find('div.subopt-' + type);
			switch(String(type)) {
				// Expression CC
				case "1":
					final_hex.push(parseInt(div_subopt.find('input[name="ccnumber"]').val()));
					final_hex.push(parseInt(div_subopt.find('input[name="ccminvalue"]').val()));
					final_hex.push(parseInt(div_subopt.find('input[name="ccmaxvalue"]').val()));
					final_hex.push(parseInt(div_subopt.find('input[name="midichannel"]').val()));
					break;
				// CC Down
				case "2":
					final_hex.push(parseInt(div_subopt.find('input[name="ccnumber"]').val()));
					final_hex.push(parseInt(div_subopt.find('input[name="ccvalue"]').val()));
					final_hex.push(parseInt(div_subopt.find('input[name="midichannel"]').val()));
					final_hex.push(0);
					break;
				// CC Up
				case "3":
					final_hex.push(parseInt(div_subopt.find('input[name="ccnumber"]').val()));
					final_hex.push(parseInt(div_subopt.find('input[name="ccvalue"]').val()));
					final_hex.push(parseInt(div_subopt.find('input[name="midichannel"]').val()));
					final_hex.push(0);
					break;
				default:
					for (let i=0; i < n_values; i++) {
						final_hex.push(0);
					}
					break;
			}
		} else {
			for (let i=0; i < (1 + n_values); i++) {
				final_hex.push(0);
			}
		}
	});

	sendSysEx(final_hex);
});

$('#save_bank_button').on('click', function() {
	var final_hex = [];
	final_hex.push(2);
	final_hex.push(bankNumber);
	stringToAscii(final_hex, $('#bank_name').val(), 25);

	sendSysEx(final_hex);
});

$('#save_settings_button').on('click', function() {
	var final_hex = [];
	final_hex.push(6);
	final_hex.push($('select[name="debounce-time"]').val());
	final_hex.push($('select[name="lp-time"]').val());
	final_hex.push($('select[name="notification-time"]').val());
	final_hex.push($('select[name="ring-bright"]').val());
	final_hex.push($('select[name="ring-dim"]').val());
	final_hex.push($('select[name="all-bright"]').val());
	final_hex.push($('select[name="omni-port-conf-1"]').val());
	final_hex.push($('select[name="omni-port-conf-2"]').val());
	final_hex.push($('select[name="req-fm3-scenes"]').val());

	sendSysEx(final_hex);
});

$('#download_current_bank_button').on('click', function() {
	var final_hex = [];
	final_hex.push(10);
	final_hex.push(0);

	sendSysEx(final_hex);
});

$('#download_all_banks_button').on('click', function() {
	bank_rx_array = [];
	bank_rx_array.push(240);
	var final_hex = [];
	final_hex.push(12);
	final_hex.push(1);

	sendSysEx(final_hex);
});

$('#restore_file').on('change', function(e) {
	$('#restore_button').show();
	$(this).siblings().first().text(e.target.files[0].name);
});

$('#restore_button').on('click', function(e) {
	let reader = new FileReader();
	reader.onload = function(e) {
		let presetDataInt8 = new Uint8Array(e.target.result);
		restore_array = [].slice.call(presetDataInt8);
		restore_array.shift(); // 240 Shift Code
		restore_array.pop(); // 247 Shift Code
		var final_hex = [];
		if (restore_array.length < 3000) {
			let ra_cont = 0;
			let ral = restore_array.length;
			while (ral > 0) {
				ral -= file_div_size;
				ra_cont += 1;
			}

			final_hex = restore_array.slice(0, file_div_size);
			final_hex.unshift(ra_cont);
			final_hex.unshift(0);
			final_hex.unshift(11);
			sendSysEx(final_hex);
			//console.log(final_hex);
		} else {
			// Restore All Banks
			final_hex = restore_array.slice(0, file_div_size);
			//final_hex.unshift(0);
			final_hex.unshift(13);
			sendSysEx(final_hex);
		}
		
		//console.log(final_hex);

	};
	reader.readAsArrayBuffer($('#restore_file').prop('files')[0]);
});


$(document).ready(function() {
	$('[data-toggle="tooltip"]').tooltip();

	// Set toggle Banks
	let select_toggle = $('select[name="toggle-bank-number"]');
	for (let i=1; i<=n_banks; i++) {
		select_toggle.append($('<option/>', {'text': 'Bank ' + i, 'value': i}));
	}

	// Preset Msg
	let div_msg = $('div.msg');
	let div_duplicate = div_msg.parent();

	for (let i=0; i < (n_messages-1); i++) {
		let div_clone = div_msg.clone()
		div_clone.find('button').first().text('Msg ' + (i+2));
		div_clone.appendTo(div_duplicate);
	}

	// Exp msg
	div_msg = $('div.exp-msg');
	div_duplicate = div_msg.parent();

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

	$('select[name="exp-type"]').on('change', function() {
		switchExpType($(this).closest('div.exp-msg'), $(this).val());
		checkExpSelect($(this));
	});

	$('div.subopt').find('input').on('change', function() {
		validateSubopt($(this));
	});

	$('.copy-button').on('click', function() {
		myCopy = $(this).closest('div.msg');
	});

	$('.paste-button').on('click', function() {
		if (myCopy == undefined) {
			return;
		}
		let msg = $(this).closest('div.msg');
		let myCopyClone = myCopy.clone();
		myCopy.find('select').each(function(i) {
			myCopyClone.find('select').eq(i).val($(this).val())
		})
		let msgNumber = msg.find('button').first().text();
		myCopyClone.find('button').first().text(msgNumber);
		msg.replaceWith(myCopyClone);
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

	$('.exp-clear-button').on('click', function() {
		let msg = $(this).closest('div.exp-msg');
		msg.find('form')[0].reset();
		msg.find('button').first().css({color: 'white'});
		msg.removeClass('msg-ok');
		msg.find('div.row').first().siblings().hide();
		msg.find('span').css({color: 'white'});
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

	$('select[name="last-used-bank"]').on('change', function() {
		if ($(this).val() == 1) {
			$(this).parent().parent().next().css({visibility: 'hidden'});
			$(this).parent().parent().next().find('input[name="bank-number"]')[0].value = '1';
			validateSubopt($($(this).parent().parent().next().find('input[name="bank-number"]')[0]));
		} else {
			$(this).parent().parent().next().css({visibility: 'visible'});
		}
	});

	//searchTeensy();
});
