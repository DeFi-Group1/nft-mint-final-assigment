
import { useState, useEffect } from "react";
import { uploadFileToIPFS, uploadJSONToIPFS } from "../pinata";
import Marketplace from '../Marketplace.json';
import { useLocation } from "react-router";
import axios from 'axios';

export default function SellNFT() {
    const [formParams, updateFormParams] = useState({ name: '', description: '', price: '' });
    const [fileURL, setFileURL] = useState(null);
    const ethers = require("ethers");
    const [message, updateMessage] = useState('');
    const location = useLocation();
    const [isDisabled, setDisabled] = useState(true);
    const [listPrice, setPrice] = useState(0.01);
  /*   async function getPrice() {
        console.log('in getPrice');
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const signer = provider?.getSigner();
        //Pull the deployed contract instance
        let contract = new ethers.Contract(Marketplace.address, Marketplace.abi, signer);
        let listPrice = await contract.getListPrice();
        console.log('listPrice = ', listPrice);
        return listPrice;
    }
    let price = getPrice(); */

    const increaseListPrice = () => {
        setPrice(prevPrice => {
            const newPrice = Number(prevPrice + prevPrice / 100);
            localStorage.setItem("listPrice", newPrice);
            return newPrice
        });
    };

    useEffect(() => {
        const initialValue = localStorage.getItem("listPrice");
        if (initialValue) setPrice(parseFloat(initialValue));
    }, []);

    /* function increaseListPrice() {
        console.log(`last price: ${listPrice}`);
        listPrice = listPrice + listPrice/100;
        setPrice(listPrice + listPrice/100);
        console.log(`new price: ${listPrice}`);
    } */

    //This function uploads the NFT image to IPFS
    async function OnChangeFile(e) {
        var file = e.target.files[0];
        console.log("data", file);
        //check for file extension
        try {
            const form = new FormData();
            form.append('my-image-file', file);
            // console.log("filename", file.name);

            const response = await axios({
                method: 'post',
                url: 'https://defi-quanterall-group.herokuapp.com/image-upload', // 'http://localhost:1337/image-upload' 'https://defi-quanterall-group.herokuapp.com/image-upload'
                data: form,
                headers: {
                    'Content-Disposition': `form-data; name="my-image-file""`,
                    'Content-Type': `multipart/form-data; boundary=${form._boundary}`,
                },
                responseType: 'blob'
            });
            console.log("file content", response);
            if (response?.statusText === "OK") {

                console.log("this file here", response.data)
                return waitForIt(response.data);

            }
        }
        catch (e) {
            console.log("Error during file upload", e);
            alert("Error during file upload");
        }

    }
    async function waitForIt(file) {
        const response = await uploadFileToIPFS(file);
        console.log(response)
        if (response.success === true) {
            setDisabled(false);
            console.log("Uploaded image to Pinata: ", response.pinataURL)
            setFileURL(response.pinataURL);
        }
    }

    //This function uploads the metadata to IPDS
    async function uploadMetadataToIPFS() {
        const { name = "random name", description = "random description", price = 0.01 } = formParams;
        //Make sure that none of the fields are empty
        if (!name || !description || !price || !fileURL)
            return;

        const nftJSON = {
            name, description, price, image: fileURL
        }

        try {
            //upload the metadata JSON to IPFS
            const response = await uploadJSONToIPFS(nftJSON);
            if (response.success === true) {
                console.log("Uploaded JSON to Pinata: ", response);
                return response.pinataURL;
            }
        }
        catch (e) {
            console.log("error uploading JSON metadata:", e)
        }
    }

    async function listNFT(e) {
        e.preventDefault();

        //Upload data to IPFS
        try {
            const metadataURL = await uploadMetadataToIPFS();
            //After adding your Hardhat network to your metamask, this code will get providers and signers
            const provider = new ethers.providers.Web3Provider(window.ethereum);
            const signer = provider?.getSigner();
            updateMessage("Please wait.. uploading (upto 5 mins)")

            //Pull the deployed contract instance
            let contract = new ethers.Contract(Marketplace.address, Marketplace.abi, signer)

            //massage the params to be sent to the create NFT request
            const price = ethers.utils.parseUnits(formParams.price, 'ether')
            let listingPrice = await contract.getListPrice()
            listingPrice = listingPrice.toString()

            //actually create the NFT
            let transaction = await contract.createToken(metadataURL, price, { value: listingPrice })
            await transaction.wait()

            increaseListPrice();

            alert("Successfully listed your NFT!");
            updateMessage("");
            updateFormParams({ name: '', description: '', price: '' });
            window.location.replace("/")
        }
        catch (e) {
            alert("Upload error" + e)
        }
    }

    return (
        <div className="">

            <div className="flex flex-col place-items-center mt-10" id="nftForm">
                <form className="bg-white shadow-md rounded px-8 pt-4 pb-8 mb-4">
                    <h3 className="text-center font-bold text-purple-500 mb-8">Upload your NFT to the marketplace</h3>
                    <div className="mb-4">
                        <label className="block text-purple-500 text-sm font-bold mb-2" htmlFor="name">NFT Name</label>
                        <input defaultValue="example name" className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" id="name" type="text" placeholder="Axie#4563" onChange={e => updateFormParams({ ...formParams, name: e.target.value })} value={formParams.name}></input>
                    </div>
                    <div className="mb-6">
                        <label className="block text-purple-500 text-sm font-bold mb-2" htmlFor="description">NFT Description</label>
                        <textarea defaultValue="example description" className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" cols="40" rows="5" id="description" type="text" placeholder="Axie Infinity Collection" value={formParams.description} onChange={e => updateFormParams({ ...formParams, description: e.target.value })}></textarea>
                    </div>
                    <div className="mb-6">
                        <label className="block text-purple-500 text-sm font-bold mb-2" htmlFor="price">Price (min {listPrice} ETH)</label>
                        <input className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" placeholder="ETH" value={formParams.price} onChange={e => updateFormParams({ ...formParams, price: e.target.value })}></input>
                    </div>
                    <div>
                        <label className="block text-purple-500 text-sm font-bold mb-2" htmlFor="image">Upload Image</label>
                        <input type={"file"} onChange={OnChangeFile}></input>
                    </div>
                    <br></br>
                    <div className="text-green text-center">{message}</div>
                    <button disabled={isDisabled} onClick={listNFT} className="font-bold mt-10 w-full bg-purple-500 text-white rounded p-2 shadow-lg">
                        List NFT
                    </button>
                </form>
            </div>
        </div>
    )
}