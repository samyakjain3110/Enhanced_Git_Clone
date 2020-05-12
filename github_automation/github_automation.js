let fs = require("fs-extra");
let path = require("path");
let puppeteer = require("puppeteer");
let uniqid = require('uniqid');
// let cheerio = require("cheerio");


let source_url = process.argv[2]; // https://github.com/Hackalist/Hackalist.github.io
let destination = process.argv[3];

(async function (){
    try{

//  **********************************************************************************************        
        console.log("Launching Browser");
        let browser = await puppeteer.launch({
            headless: false,
            defaultViewport: null,
            args: ["--start-maximized","--disable-notifications"]
        });
        console.log("Browser launch successful!");

        let tabs = await browser.pages();
        let tab = tabs[0];
        let root = {};
        await untreefy(source_url,destination,root,"repository","directory");
        fs.writeFileSync(path.join(destination,"metadata.json"),JSON.stringify(root));
 
// *********************************************************************************************        
        
    async function childrenReader(source_url){
        if(true)
        {
        console.log("entered children reader")
        await tab.goto(source_url, { waitUntil: "networkidle0" });
        await tab.waitForSelector(".files.js-navigation-container.js-active-navigation-container");
        let core_table = await tab.$$(".files.js-navigation-container.js-active-navigation-container");
        console.log(`No of tables : ${core_table.length}`);

        await tab.waitForSelector(".files.js-navigation-container.js-active-navigation-container .js-navigation-item");
        let table_rows = await tab.$$(".files.js-navigation-container.js-active-navigation-container .js-navigation-item",{ delay: 1000 });
        console.log(`found ${table_rows.length} rows`);

    // getting the no of directories and files
        var table_directory_array = await tab.$$("[aria-label='directory']");
        console.log(`No of directories : ${table_directory_array.length}`);
        let table_file_array = await tab.$$("[aria-label='file']");
        console.log(`No of files : ${table_file_array.length}`);
        }
        // getting data of files and directories
        await tab.waitForSelector(".js-navigation-item .content .js-navigation-open")
        let table_rows_data = await tab.$$(".js-navigation-item .content .js-navigation-open");
        console.log(`table_rows_data length : ${table_rows_data.length}`,{ delay: 1000 });
        let titles = [];
        let hrefs = [];
        for(let i=0;i<table_rows_data.length;i++){
            console.log("getting data of all the rows");
            let title = await tab.evaluate(function(elem){
            return elem.getAttribute("title");
        },table_rows_data[i]);
        // console.log(`title is ${title}`);
        titles.push(title);
        let href = await tab.evaluate(function(elem){
            return elem.getAttribute("href");
        },table_rows_data[i]);
        // console.log(`href is ${href}`);
        hrefs.push(href);
        }
        console.log("received data of all the rows");
        console.log(`titles : ${titles}`);
        console.log(`hrefs : ${hrefs}`);
        console.log(`table_directory_array.length ${table_directory_array.length}`);

        let childrens = [];
        childrens.push(titles);
        childrens.push(hrefs);
        childrens.push(table_directory_array.length)
        console.log("found");
        // console.log("children are :" + childrens);
        return childrens;
    }

//  *********************************************************************************************

        async function untreefy(source_url,destination,node,node_name,node_type){
        try{    
            console.log("entered untreefy");
            if(node_type === "file" ){
                console.log(` \n src  is a file with name ${node_name} and type ${node_type}`);
                let newFileName = uniqid();
                
                // let destPath = path.join(dest,newFileName);
                // fs.copyFileSync(src,destPath);
                node.isFile = true;
                node.oldName = node_name;
                node.newName = newFileName;
                node.node_url = source_url;
                node.node_type = node_type;
                //    console.log("file is copied from ")
            }
            else if(node_type === "directory"){
                console.log(` \n src  is a directory with name ${node_name} and type ${node_type}`);
                node.isFile = false;
                node.name = node_name;
                node.node_url = source_url;
                node.childrens = [];
            
                let childrens = await childrenReader(source_url);
                console.log("received childrens successfully");
                
                console.log("starting loop for childrens");
                for(let i = 0;i<childrens[0].length;i++)
                {
                // 0 -> title
                // 1 -> href
                // 2 -> directory.length
                    
                    let ctype = "unsettled";
                    if(i<childrens[2])
                    ctype = "directory";
                    else
                    ctype = "file";
                    let cpath = path.join("https://github.com/",childrens[1][i]);
                    let cname = childrens[0][i];
                    let chobj = {};
            
                //    call for each child
                    console.log(`call for child ${cname} with type : ${ctype} \n and href : ${cpath} `);
                    await untreefy(cpath,destination,chobj,cname,ctype);
                    
                    await node.childrens.push(chobj);
                }
                console.log("************************************************************************");
                console.log("traversed childrens successfully");
            }
            else
            {
                console("some error occured");
            }
             // console.log(root);
            // tab.close();
        }
        catch(error)
        {
            console.log(`error is ${error}`);
        }
        }
        tab.close();
    }

//  *********************************************************************************************    
    catch(error){
        console.log(error);
    }
    console.log("Mission Accomplished");
})();


