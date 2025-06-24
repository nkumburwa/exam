const express = require("express");
const bodyParser = require("body-parser");
const { Pool } = require("pg");

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));

// PostgreSQL connection config (hindura ibi niba bidahuye)
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'ussd',
  password: 'your_password',
  port: 5432,
});

app.post("/ussd", async (req, res) => {
  let { text, phoneNumber } = req.body;
  let inputs = text.split("*");

  // Handle back input (remove from last 0)
  if (inputs.includes("0")) {
    const lastBack = inputs.lastIndexOf("0");
    inputs = inputs.slice(0, lastBack);
  }

  const level = inputs.length;
  const lang = inputs[0];
  let response = "";

  // Step 0 - Language selection
  if (text === "" || inputs.length === 0) {
    // save session if not exist
    await pool.query("INSERT INTO sessions (phone_number) VALUES ($1) ON CONFLICT DO NOTHING", [phoneNumber]);

    response = `CON Welcome to BMI Calculator / Murakaza neza
1. English
2. Kinyarwanda`;
  }

  // Step 1 - Weight
  else if (level === 1) {
    response = lang === "1"
      ? `CON Enter your weight in KG:\n0. Back`
      : `CON Andika ibiro byawe mu kilo (KG):\n0. Subira inyuma`;
  }

  // Step 2 - Height
  else if (level === 2) {
    response = lang === "1"
      ? `CON Enter your height in CM:\n0. Back`
      : `CON Andika uburebure bwawe mu centimetero (CM):\n0. Subira inyuma`;
  }

  // Step 3 - Age
  else if (level === 3) {
    response = lang === "1"
      ? `CON Enter your age:\n0. Back`
      : `CON Andika imyaka yawe:\n0. Subira inyuma`;
  }

  // Step 4 - Show BMI & Ask for Tips
  else if (level === 4) {
    const weight = parseFloat(inputs[1]);
    const heightCm = parseFloat(inputs[2]);
    const age = parseInt(inputs[3]);
    const heightM = heightCm / 100;
    const bmi = weight / (heightM * heightM);
    const bmiRounded = bmi.toFixed(1);

    // Save data to BMI table
    await pool.query(
      "INSERT INTO bmi (phone_number, weight, height, age) VALUES ($1, $2, $3, $4)",
      [phoneNumber, weight, heightCm, age]
    );

    let status = "";
    if (bmi < 18.5) status = lang === "1" ? "Underweight" : "Ufite ibiro biri hasi cyane.";
    else if (bmi < 25) status = lang === "1" ? "Normal weight" : "Ufite ibiro bisanzwe.";
    else if (bmi < 30) status = lang === "1" ? "Overweight" : "Ufite ibiro birenze bisanzwe.";
    else status = lang === "1" ? "Obese" : "Ufite umubyibuho ukabije.";

    response = lang === "1"
      ? `CON Your BMI is ${bmiRounded} (${status})\nWould you like health tips?\n1. Yes\n2. No\n0. Back`
      : `CON BMI yawe ni ${bmiRounded} (${status})\nUkeneye inama z’ubuzima?\n1. Yego\n2. Oya\n0. Subira inyuma`;
  }

  // Step 5 - Show Tips or Goodbye
  else if (level === 5) {
    const choice = inputs[4];
    if (choice === "1") {
      response = lang === "1"
        ? `END Health Tips:\n- Eat fruits and vegetables\n- Drink water regularly\n- Avoid fast food and sugar`
        : `END Inama z'ubuzima:\n- Rya imbuto n’imboga\n- Nywa amazi kenshi\n- Irinde ibiryo bya vuba na isukari nyinshi`;
    } else if (choice === "2") {
      response = lang === "1"
        ? "END Thank you. Stay healthy!"
        : "END Murakoze. Mugire ubuzima bwiza!";
    } else {
      response = "END Invalid option.";
    }
  }

  else {
    response = "END Session ended or invalid input.";
  }

  res.set("Content-Type", "text/plain");
  res.send(response);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("BMI USSD app running on port " + PORT));
