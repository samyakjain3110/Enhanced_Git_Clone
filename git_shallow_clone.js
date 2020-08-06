let fs = require("fs-extra");
let path = require("path");
let puppeteer = require("puppeteer");

let source_url = process.argv[2]; 
let destination = process.argv[3];

(async function (){
    try{

    // getting browser ready for work
        console.log("Launching Browser");
        let browser = await puppeteer.launch({
            headless: false,
            defaultViewport: null,
            args: ["--start-maximized","--disable-notifications"]
        });
        console.log("Browser launch successful!");
        
    // call for metadata
        let tabs = await browser.pages();
        let tab = tabs[0];
        
        var repo_folder_name = path.basename(source_url);
        let root = {};
        await untreefy(tab,source_url,destination,root,repo_folder_name,"directory");
        await fs.writeFileSync(path.join(destination,"metadata.json"),JSON.stringify(root));
        
    // call for contents of files        
        let repo_metadata = require(path.join(destination, "metadata.json"));
        let repo_folder = destination;
        
        await treefy(browser,source_url, repo_folder, repo_metadata);
        await tab.close();
        console.log("got the files successfully!");
        
//  **********************************************************************************  
                                    // start of treefy block //
//  **********************************************************************************                     
                     
    async function childrenReader(tab,source_url){
        if(true)
        {
        console.log("entered children reader")
        await tab.goto(source_url, { waitUntil: "networkidle0" });
        console.log("Reached source_url") ;
        await tab.waitForSelector(".files.js-navigation-container.js-active-navigation-container");
        console.log("found container") ;
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
        console.log(`table_rows_data length : ${table_rows_data.length}`);
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

        async function untreefy(tab,source_url,dest_folder,node,node_name,node_type){
        try{    
            console.log("entered untreefy");
            if(node_type === "file" ){
                console.log(` \n src  is a file with name ${node_name} and type ${node_type}`);
                node.isFile = true;
                node.node_type = node_type;
                node.name = node_name;
                node.node_url = source_url;
                node.dest_folder = path.join(dest_folder,node_name); 
               
            }
            else if(node_type === "directory"){
                console.log(` \n src  is a directory with name ${node_name} and type ${node_type}`);
                node.isFile = false;
                node.node_type = node_type;
                node.name = node_name;
                node.node_url = source_url;
                node.dest_folder = path.join(dest_folder,node_name);  // folder inside which it exists
                node.childrens = [];
                
                let childrens = await childrenReader(tab,source_url);
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
                    let c_dest_folder = node.dest_folder;
                    let chobj = {};
            

                    // dest_folder = path.join(dest_folder,node_name);
                //    call for each child
                    console.log(`call for child ${cname} with type : ${ctype} \n and href : ${cpath} `);
                    await untreefy(tab,cpath,c_dest_folder,chobj,cname,ctype);
                    
                    await node.childrens.push(chobj);
                }
                console.log("************************************************************************");
                console.log("traversed childrens successfully");
            }
            else
            {
                console("some error occured");
            }

        }
        catch(error)
        {
            console.log(`error is ${error}`);
        }

        }  // end of untreefy

                                // end of untreefy block  //

                                
//  ********************************************************************************************* 
                                // start of treefy block //
//  *********************************************************************************************   

async function treefy(browser,folder_url, dest_folder, node) {
    // console.log(node);

    // console.log(`inside treefy with node as ${node.name} and ${node.node_type}`);
   
     if (node.node_type == "directory" && node.isFile === false) {
        //  console.log(`inside directory with name ${node.name} `);

        // src is a directory
        let dirPath = path.join(dest_folder, node.name);
        await fs.mkdirSync(dirPath);  // creating the folder with name of the child
        
        let childrens = node.childrens;
        let no_of_files_children = 0;
        let no_of_folder_children = 0;
        for (let i = 0; i < childrens.length; i++) {
            let child = childrens[i];
            if(child.isFile === true)
            {no_of_files_children++;}
            else if(child.isFile === false)
            {no_of_folder_children++;}
        }

        console.log(`Directory "${node.name}" contains : `);
        console.log(`${no_of_files_children} files and ${no_of_folder_children} folders \n`);

        let files_children_array = [];
        for (let i = no_of_folder_children;i < childrens.length; i++) {
            let child = childrens[i];
            await files_children_array.push(child);
         }
         let willhandlefiles = await files_would_be_handled(browser,files_children_array);
        // let willhandlefiles = await files_would_be_handled(browser,Tab,childrens,no_of_files_children,no_of_folder_children);

        for (let i = 0;i < no_of_folder_children; i++) {
            let child = childrens[i];
            let folderPath = dirPath;  // it is actually path of folder in which child is present
            let folder_url = child.node_url; // folder_url inside which it resides on net
            await treefy(browser,folder_url, folderPath, child);
        }
    }
}

async function files_would_be_handled(browser,files_children_array){
    // console.log(`entered files would be handled `);
    
    let pArr =  [];
    // console.log(files_children_array.length);
    for(let i=0;i<files_children_array.length;i++){
        
        let child = files_children_array[i];
        let willhandlefile = handleSingleFile(browser,child);
        pArr.push(willhandlefile);
    }
//  waiting for promises of all the files to be resolved 
    await Promise.all(pArr); 
}

async function handleSingleFile(browser,child){
    try
    {
        // console.log("entered handleSingleFile");
        let link = child.node_url;
        let file_path = child.dest_folder;

    //   extract the data of single file and return content to be stored in array
        let newTab = await browser.newPage();
        await newTab.goto(link,{ waitUntil : "networkidle0" });
        await newTab.waitForSelector("#raw-url");
        await Promise.all([newTab.click("#raw-url"),newTab.waitForNavigation({waitUntil:"networkidle0"})]);
        // newTab.click("#raw-url");    

        // getting the text of file
        var content = await newTab.evaluate(() => {
            console.log("i am in evaluate");
            let el = document.querySelector('pre');
            let text = el.innerText;
            return text;
           });
        //    console.log("received content \n"); 
        //  console.log(content); 

        // writing text into file
        await fs.writeFile(file_path, content, (err) => {
            if (err) console.log("Unable to write a file content");
          });
        
        await newTab.close();
    } 
      catch (err) {
        console.log("some error occured !");
        console.log(err);
      }
  }

    } // end of try block

//  *********************************************************************************************    

    catch(error){
        console.log(error);
    }

    console.log("Mission Accomplished");
})();


