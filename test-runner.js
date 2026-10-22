import { classify, toGoogleSheetsRow } from "./src/classify.js";

const rawInput = `called today 10/21/2026
renter 2 cars maybe
statefarm 3 yrs

2020 Toyta Camery
2018 Hondaa Civik

DOB 04/17/1989
Mark J. Ellis
481 Sample Creek Rd, Columbus, OH 43000
(202) 555-0101


---------------------------------------------------

home owner
2023 Hyundia Tuscon
progresiv 1 yr

quote date oct 20 2026
08/14/1976
Lena M Carter
 729 Example Ridge Ave
 Apt 3B
Dayton, Ohio 45000

202-555-0102


---------------------------------------------------

2019 Nisan Rougue
all state 2 year renter

DOB: March 6 1978
last updated 10/22/2026

Daniel Brooks
182 Sample Oak Ln,
Austin TX
78000

(202) 555-0103


---------------------------------------------------

2 vehicals home owner
2017 Ford Fussion
2021 Cheverolet Equinox

nationl genral 4 yrs

customer called 10/19/26

DOB 11/23/1994
Amanda L. Reed
593 Example Meadow Dr, Phoenix, AZ 85000
2025550104


---------------------------------------------------

renter 6 months
geicoo

2016 Jeep Grand Cheroke


followup 10/24/2026

Tyler M Parker
 618 Sample Valley Rd
Unit 6
Denver, CO 80000

(202) 555-0105


---------------------------------------------------

2022 Kia Sorento
homeowner / libery mutal / 2yrs

DOB 17 May 1983


Robert A Wilson
246 Example Park Ave, Orlando, FL 32000
202-555-0106


---------------------------------------------------

renter state fram 1 year
2018 Toyta Corola

date entered 10/22/2026
DOB 12/05/1990
Nicole Hayes
 917 Sample Hill St,
Nashville TN 37000

2025550107


---------------------------------------------------

3 cars? actually 2
2020 Mazdaa CX5
2024 Hondaa CRV

allstatee 5 yrs homeowner

07-21-1976
last quote 10/20/2026

Christopher Reed
382 Example Lake Rd
Charlotte, NC 28000
(202) 555-0108


---------------------------------------------------

progressiv 8 months renter
2019 Chevvy Malibu

2 14 1978

called back October 22 2026

Sarah J Mitchell
 126 Sample Forest Ave
Seattle, Washington
98000

202-555-0109


---------------------------------------------------

home owner
2021 Ford Escap
2023 Toyta Rav 4

farmers insurence 3 year

09/18/1987

created 2026/10/21

Kevin Thomas Brooks
843 Example Ridge Dr, Portland, OR 97000
(202) 555-0110


---------------------------------------------------

1 car renter
2015 Nisan Sentra
national genral 1 yr

January 4 1998
appointment date 10/23/2026

Mia R. Foster
 275 Sample Brook Ln
Apt #2
Canton, Ohio 44000

2025550111


---------------------------------------------------

home owner 2 cars
2018 Hondaa Accord
2020 Cheverolet Malibuu

state farmm 4 yrs

10/02/1979
updated 10-22-2026

George Allen Parker
518 Example Oak St, Austin TX 78000
(202) 555-0112


---------------------------------------------------

renter / geico / 2 year

2017 Hyundia Elantra

 6 16th 2008
quote taken on 10/17/2026

Olivia M. Turner
 719 Sample Park Ln,
Denver CO
80000

202-555-0113


---------------------------------------------------

2022 Ford F-150
2020 Toyta Highlnder

homeowner
progresive 6 years

3rd December 1982
follow up 10/25/2026

Anthony J Hayes
641 Example Creek Rd
Columbus OH 43000
(202) 555-0114


---------------------------------------------------

renter state farm 10 months

2019 Kia Forte
2016 Nisan Altima

5 9 1998
last contact 2026-10-21

Isabella Marie Collins
 391 Sample Meadow St
Unit 12
Orlando FL 32000

2025550115`;

const leads = rawInput.split(/---------------------------------------------------/);

console.log("TOTAL LEADS TO PROCESS:", leads.length);

leads.forEach((lead, i) => {
  const trimmed = lead.trim();
  if (!trimmed) return;
  console.log(`\n=================== LEAD #${i + 1} ===================`);
  const record = classify(trimmed);
  const row = toGoogleSheetsRow(trimmed);
  console.log("Parsed Record:", JSON.stringify(record, null, 2));
  console.log("\nGoogle Sheets Row (Tab-separated):\n" + row);
});
