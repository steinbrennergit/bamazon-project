const mysql = require('mysql');
const inquirer = require('inquirer');
const Table = require('cli-table');

var dataTable = null;

var validIDs = [];

const con = mysql.createConnection({
    host: "localhost",

    // Your port; if not 3306
    port: 3306,

    // Your username
    user: "root",

    // Your password
    password: "root",
    database: "bamazon"
});

con.connect(function (err) {
    if (err) throw err;
    start();
});

function start() {
    con.query("SELECT * FROM products", (err, res) => {
        if (err) throw err;

        buildTable(res);

        console.log("");
        console.log(dataTable.toString());
        console.log("");
        promptUser();
    });
}

function promptUser() {
    inquirer.prompt([
        {
            type: "input",
            message: "Enter the ID of the product you would like to purchase: ",
            name: "id",
            validate: function (input) {
                let id = parseInt(input);
                if (validIDs.indexOf(id) === -1) {
                    console.log("\n\nInvalid ID, please try again.\n");
                    return false;
                } else {
                    return true;
                }
            }
        }
    ]).then((ans) => {
        let query = "SELECT * FROM products WHERE item_id = " + ans.id;
        con.query(query, (err, res) => {
            if (err) throw err;

            displayItem(res[0]);

            inquirer.prompt([{
                type: "confirm",
                message: "Is this the item you wish to purchase?",
                name: "confirm"
            }]).then((ans) => {
                if (ans.confirm) {
                    purchaseItem(res[0]);
                } else {
                    start();
                }
            });
        });
    });
}

function purchaseItem(item) {
    let nums = [];
    for (let i = 1; i <= item.stock_quantity; i++) {
        nums.push(i.toString());
    }
    inquirer.prompt([
        {
            type: "list",
            message: "How many would you like to purchase?",
            choices: nums,
            name: "amount"
        }
    ]).then((ans) => {
        let amt = ans.amount;
        let stock = parseInt(item.stock_quantity);
        if (amt > stock) {
            console.log("\nSorry! We only have " + stock + " of these in stock. Please enter a new amount.\n");
            purchaseItem(item);
        } else {
            let totalCost = parseInt(item.price) * amt;
            console.log("\nGot it! We're sending " + amt + " of this product to you now.\n");
            console.log("This cost a total of $" + totalCost + ".\n");
            removeStock(item, amt);
        }
    });
}

function removeStock(item, num) {
    let newQuantity = item.stock_quantity - num;
    let query = "UPDATE products SET stock_quantity = " + newQuantity
        + " WHERE item_id = " + item.item_id;

    con.query(query, (err, res) => {
        if (err) throw err;

        console.log(res.affectedRows + " items have been updated.\n\n");

        inquirer.prompt([
            {
                type: "confirm",
                message: "Did you want to buy something else?",
                name: "confirm"
            }
        ]).then((ans) => {
            if (ans.confirm) {
                start();
            } else {
                console.log("\n\nThank you for your business!\n\n");
                return con.end();
            }
        });
    });
}

function buildTable(items) {
    dataTable = new Table({
        head: ['ID', 'Name', 'Price'],
        colWidths: [10, 20, 10]
    });

    items.forEach((item) => {
        if (item.stock_quantity > 0) {
            dataTable.push([item.item_id, item.product_name, item.price]);
            if (validIDs.indexOf(item.item_id) === -1) {
                validIDs.push(item.item_id);
            }
        }
    });
}

function displayItem(item) {
    console.log("\n####################");
    console.log("\nPRODUCT ID: " + item.item_id);
    console.log("\nProduct name: " + item.product_name);
    console.log("\nPrice: $" + item.price);
    console.log("\n####################\n");
}