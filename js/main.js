/**
 * Constants
 */
var queryAPI = "https://fumx256y2c.execute-api.ap-southeast-1.amazonaws.com/dev/sn/incentive";
var incentiveURL = "https://explorer.pal.network/incentive?address=";

var superNodeReqTokens = 100000;
var maxConfirmationsForHighestBonus = 100;

// time
var gmtTime = 8; // 8 hrs ahead

class RowItems {
    constructor(address, row, order) {
        this.address = address;
        this.row = row;
        this.order = order;
    }

    getRow() {
        return this.row;
    }

    getAddress() {
        return this.address;
    }

    getOrder() {
        return this.order;
    }
}

/*
 * Functions
 */
var totalTx = 0;
var totalEarnings = 0;
var addressSplit = null;
var completedQueryCount = 0;
var addrMap = new Map();

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

    // Add to map
    var inputAddresses = document.getElementById('input_addresses').value;
    addressSplit = inputAddresses.split(",");


    for (var i = 0; i < addressSplit.length; i++) {
        var address = addressSplit[i];

        var newRow = tableElement.insertRow(-1);
        newRow.className = "table_results_tr";

        addrMap.set(address, new RowItems(address, newRow, i + 1));
    }

    // Results div
    var resultsDivElement = document.getElementById('resultsDiv');
    resultsDivElement.style.display = "block";

    totalTx = 0;
    totalEarnings = 0;
    completedQueryCount = 0;

    for (var i = 0; i < addressSplit.length; i++) {
        var address = addressSplit[i];

        $.ajax({
            type: "GET",
            url: queryAPI,
            data: "address=" + address,

            headers: { // Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,pal-api-token
                //'X-Amz-Security-Token': address,
            },
            beforeSend: function (xhr) {
                //request.setRequestHeader("Addr", address);
            },
            cache: false,
            //async: false,

            success: function (result, textStatus, jqXHR) {
                completedQueryCount++;

                var txCount = result.tx_count;
                var bonus = result.bonus;
                var incentive = result.incentive;
                var bIsValid = result.is_valid == true;
                var transactionsCount = result.transactions.length;

                console.log(result);
                //console.log(bIsValid);
                //console.log(result.tx_count);
                //console.log(transactionsCount);

                //var newRow = tableElement.insertRow(-1);
                //newRow.className = "table_results_tr";

                var url = new URL(this.url);
                var addrParam = url.searchParams.get("address");
                var rowItem = addrMap.get(addrParam);
                if (rowItem == null)
                    return;
                var newRow = rowItem.getRow();

                // Last transaction
                //timestamp: "2019-04-17 11:22:01"
                var dateNow = new Date;
                var utc_timestamp = Date.UTC(dateNow.getUTCFullYear(), dateNow.getUTCMonth(), dateNow.getUTCDate(),
                    dateNow.getUTCHours() + gmtTime, dateNow.getUTCMinutes(), dateNow.getUTCSeconds(), dateNow.getUTCMilliseconds());
                var dateNow_SGT = new Date(utc_timestamp);

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
                        parseInt(timestamp_2_split[0]) + gmtTime, parseInt(timestamp_2_split[1]), parseInt(timestamp_2_split[2]), 0);
                    var date_tx = new Date(utc_txTimestamp);

                    //console.log(utc_timestamp + " " + date);
                    var relativeDiff = timeDifference(utc_timestamp, utc_txTimestamp);

                    if (!bFirstTx) {
                        bFirstTx = true;

                        var cell_lastTxTime = newRow.insertCell(0);
                        if (relativeDiff.indexOf("mins ago") != -1 || relativeDiff.indexOf("min ago") != -1 || relativeDiff.indexOf("secs ago") != -1 || relativeDiff.indexOf("sec ago") != -1) {
                            var bold = document.createElement('strong');
                            bold.appendChild(document.createTextNode(relativeDiff));

                            cell_lastTxTime.appendChild(bold);
                        } else {
                            let column_lastTxTime = document.createTextNode(relativeDiff);

                            cell_lastTxTime.appendChild(column_lastTxTime);
                        }
                    }

                    // determine the number of tx for this month
                    if (dateNow_SGT.getUTCFullYear() == date_tx.getUTCFullYear() && dateNow_SGT.getUTCMonth() == date_tx.getUTCMonth()) {
                        txThisMonth++;
                    }
                }

                var bonusByTx = calcBonusByTxCount(txThisMonth);

                // TX count cell
                var totalTxText = !bIsValid ? 0 : " (" + transactionsCount + ")";
                var thisMonthText = !bIsValid ? 0 : txThisMonth;

                var cell_txCount = newRow.insertCell(0);
                if (txThisMonth >= maxConfirmationsForHighestBonus) {
                    var bold = document.createElement('strong');
                    bold.appendChild(document.createTextNode(thisMonthText));

                    let column_txCount = document.createTextNode(totalTxText);

                    cell_txCount.appendChild(bold);
                    cell_txCount.appendChild(column_txCount);
                } else {
                    let column_txCount = document.createTextNode(!bIsValid ? 0 : thisMonthText + totalTxText);

                    cell_txCount.appendChild(column_txCount);
                }

                // Bonus cell
                var monthlyROI_perc = (incentive / superNodeReqTokens) * 100; // 8%
                var annualROI = calcCompoundInterest(superNodeReqTokens, monthlyROI_perc / 100, 1, 12);
                var annualROIPerc = (annualROI / superNodeReqTokens) * 100;

                var cell_bonus = newRow.insertCell(0);
                let column_bonus = document.createTextNode(!bIsValid ? 0 : ((bonusByTx * 100) + "%") + " (" + annualROIPerc.toFixed(1) + "% / year)");
                cell_bonus.appendChild(column_bonus);

                // Earnings cell
                var cell_earnings = newRow.insertCell(0);
                let column_earnings = document.createTextNode(!bIsValid ? "(Unknown)" : ((txThisMonth <= 0 ? 0 : (incentive).toFixed(2)) + " PAL"));
                cell_earnings.appendChild(column_earnings);

                // Address cell
                var cell_address = newRow.insertCell(0);
                let column_address = document.createTextNode(addrParam);

                var addressAHref = document.createElement('a');
                addressAHref.appendChild(column_address);
                addressAHref.title = (incentiveURL + addrParam);
                addressAHref.href = (incentiveURL + addrParam);
                addressAHref.target = "_blank";
                if (txThisMonth >= maxConfirmationsForHighestBonus) {
                    addressAHref.style.setProperty('text-decoration', 'line-through');
                }
                cell_address.className = "table_results_td";
                cell_address.appendChild(addressAHref);

                // Order cell
                var cell_order = newRow.insertCell(0);
                let column_order = document.createTextNode(rowItem.getOrder());
                cell_order.appendChild(column_order);

                // Update total earnings
                totalEarnings += incentive;
                //totalEarningsElement.innerHTML = parseInt(totalEarningsElement.innerHTML) + incentive;

                // Update total transactions
                totalTx += txCount;
                //totalTxElement.innerHTML = parseInt(totalTxElement.innerHTML) + txCount;
            },
            error: function (XMLHttpRequest, textStatus, errorThrown) {
                console.log("Error querying API. Have you tried restarting your PC? :D " + XMLHttpRequest.statusText + " " + textStatus + " " + errorThrown);
            }
        });
    }
    //console.log(inputAddresses);

    // Update total after 3 seconds
    intervalObj = setInterval(onCheckCompleteBulkQuery,1000);
}

var intervalObj = null;
function onCheckCompleteBulkQuery() {
    console.log("completed count: " + completedQueryCount + " " + addressSplit.length);

    if (completedQueryCount >= addressSplit.length) {
        clearInterval(intervalObj);

        var totalEarningsElement = document.getElementById('h3_totalEarnings');
        var totalTxElement = document.getElementById('h3_totalTxCount');
        var totalAddressElement = document.getElementById('h3_totalAddressCount');;

        totalEarningsElement.innerHTML = totalEarnings.toFixed(2);
        totalTxElement.innerHTML = totalTx;
        totalAddressElement.innerHTML = addressSplit.length;

        document.getElementById('button_query').disabled = false;

        addrMap.clear();

        bIsQuerying = false;
    }
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

function calcBonusByTxCount(count) {
    if (count >= 100) {
        return 0.5;
    } else if (count >= 80) {
        return 0.4;
    } else if (count >= 60) {
        return 0.3;
    } else if (count >= 40) {
        return 0.2;
    } else if (count >= 20) {
        return 0.1;
    }
    return 0;
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