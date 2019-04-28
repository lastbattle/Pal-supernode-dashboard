/**
 * Constants
 */
var queryAPI = "https://fumx256y2c.execute-api.ap-southeast-1.amazonaws.com/dev/sn/incentive?address=";

/*
 * Functions
 */
var bIsQuerying = false;
function queryInputAddresses() {
    if (bIsQuerying) {
        return;
    }
    bIsQuerying = true;

    document.getElementById('button_query').disabled = true;

    // Sum element
    var totalEarningsElement = document.getElementById('h3_totalEarnings');
    totalEarningsElement.innerHTML = "0";

    // Total transaction element
    var totalTxElement = document.getElementById('h3_totalTxCount');
    totalTxElement.innerHTML = "0";

    // Total address element
    var totalAddressElement = document.getElementById('h3_totalAddressCount');;

    // Table element
    var tableElement = document.getElementById('table_results');
    // Cleanup existing table
    for (var i = tableElement.rows.length - 1; i > 0; i--) {
        tableElement.deleteRow(i);
    }

    setTimeout(function () {
        try {
            // Input address
            var inputAddresses = document.getElementById('input_addresses').value;
            var addressSplit = inputAddresses.split(",");

            // Results div
            var resultsDivElement = document.getElementById('resultsDiv');
            resultsDivElement.style.display = "block";

            var totalTx = 0;
            var totalEarnings = 0;

            for (var i = 0; i < addressSplit.length; i++) {
                var address = addressSplit[i];

                $.ajax({
                    type: "GET",
                    url: queryAPI + address,
                    processData: false,
                    contentType: false,
                    cache: false,
                    async: false, // racing condition though :( 

                    success: function (result) {
                        var txCount = result.tx_count;
                        var bonus = result.bonus;
                        var incentive = result.incentive;
                        var bIsValid = result.is_valid == true;
                        var transactionsCount = result.transactions.length;


                        console.log(result);
                        //console.log(bIsValid);
                        console.log(address);
                        //console.log(result.tx_count);
                        //console.log(transactionsCount);

                        var newRow = tableElement.insertRow(-1);
                        newRow.className = "table_results_tr";

                        // TX count cell
                        var cell_txCount = newRow.insertCell(0);
                        let column_txCount = document.createTextNode(!bIsValid ? 0 : transactionsCount);
                        cell_txCount.appendChild(column_txCount);

                        // Last transaction
                        //timestamp: "2019-04-17 11:22:01"
                        var bFirstTx = false;
                        for (var z = 0; z < result.transactions.length; z++) {
                            var tx = result.transactions[z];
         
                            var timestamp_split = tx.timestamp.split(' ');
                            var timestamp_1_split = timestamp_split[0].split('-');
                            var timestamp_2_split = timestamp_split[1].split(':');

                            //var date = Date.parse(tx.timestamp);
                            var date = Date.UTC(
                                parseInt(timestamp_1_split[0]), parseInt(timestamp_1_split[1]) - 1, parseInt(timestamp_1_split[2]),
                                parseInt(timestamp_2_split[0]), parseInt(timestamp_2_split[1]), parseInt(timestamp_2_split[2]), 0);

                            var now = new Date;
                            var utc_timestamp = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(),
                                now.getUTCHours(), now.getUTCMinutes(), now.getUTCSeconds(), now.getUTCMilliseconds());

                            //console.log(utc_timestamp + " " + date);

                            var relativeDiff = timeDifference(utc_timestamp, date);

                            if (!bFirstTx) {
                                bFirstTx = true;

                                var cell_lastTxTime = newRow.insertCell(0);
                                let column_lastTxTime = document.createTextNode(relativeDiff);
                                cell_lastTxTime.appendChild(column_lastTxTime);
                                break;
                            }
                        }

                        // Bonus cell
                        var cell_bonus = newRow.insertCell(0);
                        let column_bonus = document.createTextNode(!bIsValid ? 0 : ((bonus * 100) + "%"));
                        cell_bonus.appendChild(column_bonus);

                        // Earnings cell
                        var cell_earnings = newRow.insertCell(0);
                        let column_earnings = document.createTextNode(!bIsValid ? "(Unknown)" : ((incentive).toFixed(2) + " PAL"));
                        cell_earnings.appendChild(column_earnings);

                        // Address cell
                        var cell_address = newRow.insertCell(0);
                        let column_address = document.createTextNode(address);

                        var addressAHref = document.createElement('a');
                        addressAHref.appendChild(column_address);
                        addressAHref.title = "https://explorer.pal.network/address/" + address;
                        addressAHref.href = "https://explorer.pal.network/address/" + address;
                        addressAHref.target = "_blank";

                        cell_address.className = "table_results_td";
                        cell_address.appendChild(addressAHref);


                        // Update total earnings
                        totalEarnings += incentive;
                        //totalEarningsElement.innerHTML = parseInt(totalEarningsElement.innerHTML) + incentive;

                        // Update total transactions
                        totalTx += txCount;
                        //totalTxElement.innerHTML = parseInt(totalTxElement.innerHTML) + txCount;
                    },
                    error: function (XMLHttpRequest, textStatus, errorThrown) {
                        alert("Error querying API. Have you tried restarting your PC? :D " + XMLHttpRequest.statusText + " " + textStatus + " " + errorThrown);
                    }
                });
            }

            //console.log(inputAddresses);
        } finally {
            totalEarningsElement.innerHTML = totalEarnings.toFixed(2);
            totalTxElement.innerHTML = totalTx;
            totalAddressElement.innerHTML = addressSplit.length;

            document.getElementById('button_query').disabled = false;

            bIsQuerying = false;
        }
    }, 0);
}

//////////////////////////////// UTILS
function Base64Encode(str, encoding = 'utf-8') {
    var bytes = new (TextEncoder || TextEncoderLite)(encoding).encode(str);
    return base64js.fromByteArray(bytes);
}

function Base64Decode(str, encoding = 'utf-8') {
    var bytes = base64js.toByteArray(str);
    return new (TextDecoder || TextDecoderLite)(encoding).decode(bytes);
}

function generateRandomText(length) {
    var text = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    for (var i = 0; i < length; i++)
        text += possible.charAt(Math.floor(Math.random() * possible.length));

    return text;
}

function timeDifference(current, previous) {

    var msPerMinute = 60 * 1000;
    var msPerHour = msPerMinute * 60;
    var msPerDay = msPerHour * 24;
    var msPerMonth = msPerDay * 30;
    var msPerYear = msPerDay * 365;

    var elapsed = current - previous;

    if (elapsed < msPerMinute) {
        return Math.round(elapsed / 1000) + ' secs ago';
    }

    else if (elapsed < msPerHour) {
        return Math.round(elapsed / msPerMinute) + ' mins ago';
    }

    else if (elapsed < msPerDay) {
        return Math.round(elapsed / msPerHour) + ' hrs ago';
    }

    else if (elapsed < msPerMonth) {
        return Math.round(elapsed / msPerDay) + ' days ago';
    }

    else if (elapsed < msPerYear) {
        return Math.round(elapsed / msPerMonth) + ' months ago';
    }

    else {
        return Math.round(elapsed / msPerYear) + ' years ago';
    }
}