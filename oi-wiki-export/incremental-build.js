'use strict'

const { Octokit } = require("@octokit/core");
const util = require("util")
const fs = require('fs').promises
const path = require("path")

const PATH_TO_CHAPTER = {
  "intro": 0,
  "contest": 1,
  "tools": 2,
  "lang": 3,
  "basic": 4,
  "search": 5,
  "dp": 6,
  "string": 7,
  "math": 8,
  "ds": 9,
  "graph": 10,
  "geometry": 11,
  "misc": 12,
  "topic": 13
}


async function main () {
  if (process.argv.length !== 4) {
    console.log('This script is intended for running on Github Actions.')
    console.log('Usage: node ' + __filename.split('/').pop() + ' ${{ github.ref }} +  ${{ secrets.GITHUB_TOKEN }}')
  }

  const PrNumber = process.argv[2].split("/")[2]
  const token = process.argv[3]
  console.log(`Current PR Number: ${PrNumber}`)

  const octokit = new Octokit({
    auth: token
  })

  const owner = "OI-wiki"
  const repo = "OI-wiki"
  let data
  // TODO: error handling for API request
  try {
    const response = await octokit.request(`GET /repos/${owner}/${repo}/pulls/${PrNumber}/files`, {
      owner,
      repo,
      pull_number: PrNumber,
      headers: {
        'X-GitHub-Api-Version': '2022-11-28'
      }
    })
    data = response.data
  } catch (error) {
    // TODO: if there is no such PR then go full build?
    console.error('Error fetching data:\n', error);
    process.exit()
  }
  // const formattedJson = util.inspect(data, {colors: true})
  // console.log(`changed files in JSON format: ${formattedJson}`)
  const changedFiles = data
    .map(item => item.filename) // extract file name from JSON
    .filter(path => path.includes("docs/")) // we only need to detect doc file
    .map(path => path.split("/")[1]) 

  const changedPaths = new Set(changedFiles)  // we only need unique values to determine changed chapters

  // map path to chapter
  const changedChapters = []
  for (const path of changedPaths) {
    changedChapters.push(PATH_TO_CHAPTER[path])
  }

  console.log(`changed files: ${util.inspect(data.map(item => item.filename), {colors: true})}`)
  console.log(`changed unique sub paths: ${util.inspect(changedPaths, {colors: true})}`)
  console.log(`changed chapters: ${util.inspect(changedChapters, {colors: true})}`)

  // wrtie changed chapter to includes.tex
  console.log('Overwriting includes.tex for incremental build...')
  let includes = ''
  for (const id of changedChapters) {
    const texModule = path.join('tex', id.toString())
    includes += '\\input{' + texModule + '}\n' // 输出 includes.tex 章节目录文件
  }
  await fs.writeFile('includes.tex', includes)
  console.log('Complete')
  
  process.exit()
}


main()
