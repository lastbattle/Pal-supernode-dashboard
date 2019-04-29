/**
 * Constants
 */
var queryAPI = "https://fumx256y2c.execute-api.ap-southeast-1.amazonaws.com/dev/sn/incentive?address=";
var superNodeReqTokens = 100000;

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

                        // Last transaction
                        //timestamp: "2019-04-17 11:22:01"
                        var dateNow = new Date;
                        var utc_timestamp = Date.UTC(dateNow.getUTCFullYear(), dateNow.getUTCMonth(), dateNow.getUTCDate(),
                            dateNow.getUTCHours(), dateNow.getUTCMinutes(), dateNow.getUTCSeconds(), dateNow.getUTCMilliseconds());

                        var bFirstTx = false;
                        var txThisMonth = 0;
                        for (var z = 0; z < result.transactions.length; z++) {
                            var tx = result.transactions[z];

                            var timestamp_split = tx.timestamp.split(' ');
                            var timestamp_1_split = timestamp_split[0].split('-');
                            var timestamp_2_split = timestamp_split[1].split(':');

                            //var date = Date.parse(tx.timestamp);
                            var utc_txTimestamp = Date.UTC(
                                parseInt(timestamp_1_split[0]), parseInt(timestamp_1_split[1]) - 1, parseInt(timestamp_1_split[2]),
                                parseInt(timestamp_2_split[0]), parseInt(timestamp_2_split[1]), parseInt(timestamp_2_split[2]), 0);
                            var date_tx = new Date(utc_txTimestamp);

                            //console.log(utc_timestamp + " " + date);
                            var relativeDiff = timeDifference(utc_timestamp, utc_txTimestamp);

                            if (!bFirstTx) {
                                bFirstTx = true;

                                var cell_lastTxTime = newRow.insertCell(0);
                                if (relativeDiff.indexOf("mins ago") != -1 || relativeDiff.indexOf("min ago") != -1) {
                                    var bold = document.createElement('strong');
                                    bold.appendChild(document.createTextNode(relativeDiff));

                                    cell_lastTxTime.appendChild(bold);
                                } else {
                                    let column_lastTxTime = document.createTextNode(relativeDiff);

                                    cell_lastTxTime.appendChild(column_lastTxTime);
                                }
                            }

                            // determine the number of tx for this month
                            if (dateNow.getUTCFullYear() == date_tx.getUTCFullYear() && dateNow.getUTCMonth() == date_tx.getUTCMonth()) {
                                txThisMonth++;
                            }
                        }

                        // TX count cell
                        var thisMonthText = !bIsValid ? 0 : " (" + txThisMonth + ")";

                        var cell_txCount = newRow.insertCell(0);
                        if (txThisMonth >= 100) {
                            let column_txCount = document.createTextNode(!bIsValid ? 0 : transactionsCount);

                            var bold = document.createElement('strong');
                            bold.appendChild(document.createTextNode(thisMonthText));

                            cell_txCount.appendChild(column_txCount);
                            cell_txCount.appendChild(bold);
                        } else {
                            let column_txCount = document.createTextNode(!bIsValid ? 0 : transactionsCount + thisMonthText);

                            cell_txCount.appendChild(column_txCount);
                        }

                        // Bonus cell
                        var monthlyROI_perc = (incentive / superNodeReqTokens) * 100; // 8%
                        var annualROI = calcCompoundInterest(superNodeReqTokens, monthlyROI_perc / 100, 1, 12);
                        var annualROIPerc = (annualROI / superNodeReqTokens) * 100;

                        var cell_bonus = newRow.insertCell(0);
                        let column_bonus = document.createTextNode(!bIsValid ? 0 : ((bonus * 100) + "%") + " (" + annualROIPerc.toFixed(1)+"% / year)");
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
function calcCompoundInterest(principal, annual_rate, n_times, t_years) {
    return principal * (Math.pow(1 + annual_rate / n_times, n_times * t_years) - 1);
}

function timeDifference(current, previous) {

    var msPerMinute = 60 * 1000;
    var msPerHour = msPerMinute * 60;
    var msPerDay = msPerHour * 24;
    var msPerMonth = msPerDay * 30;
    var msPerYear = msPerDay * 365;

    var elapsed = current - previous;

    if (elapsed < msPerMinute) {
        var seconds = Math.round(elapsed / 1000);

        if (seconds == 1) {
            return seconds + ' sec ago';
        }
        return seconds + ' secs ago';
    }

    else if (elapsed < msPerHour) {
        var mins = Math.round(elapsed / msPerMinute);

        if (mins == 1) {
            return mins + ' min ago';
        }
        return mins + ' mins ago';
    }

    else if (elapsed < msPerDay) {
        var hrs = Math.round(elapsed / msPerHour);

        if (hrs == 1) {
            return hrs + ' hr ago';
        }
        return hrs + ' hrs ago';
    }

    else if (elapsed < msPerMonth) {
        var days = Math.round(elapsed / msPerDay);

        if (days == 1) {
            return days + ' day ago';
        }
        return days + ' days ago';
    }

    else if (elapsed < msPerYear) {
        var months = Math.round(elapsed / msPerMonth);

        if (months == 1) {
            return months + ' month ago';
        }
        return months + ' months ago';
    }

    else {
        var years = Math.round(elapsed / msPerYear);

        if (years == 1) {
            return years + ' year ago';
        }
        return years + ' years ago';
    }
}