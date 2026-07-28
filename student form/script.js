    var list=document.querySelectorAll("input")
    var tableBody=document.getElementById("tablebody")
    function saveData(){
        var tr=document.createElement("tr")
        for(i=0;i<list.length;i++)
        {
            var td=document.createElement("td")
            if(list[i].type==="radio")
            {
                if(!list[i].checked)
                {
                    continue;
                }
            }
            td.textContent=list[i].value
            tr.append(td)
        }
        var deleterow=document.createElement("td")
        deleterow.innerHTML="<button onclick='deleterow(event)'>Delete</button>"
        tr.append(deleterow)
        tableBody.append(tr)
    }
    function deleterow(event)
    {
        event.target.parentElement.parentElement.remove()
    }