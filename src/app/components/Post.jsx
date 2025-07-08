import DeletePostButton from "./DeletePostButton";

export default function Post({id, title, content, authorName}) {
    return(
        <div className="bg-white rounded-2xl shadow-md p-6 max-w-sm w-full">
            <h3>{authorName}</h3>
            <h4 className="text-xl font-semibold mb-2">{title}</h4>
            <p className="text-gray-600 mb-4">{content}</p>
            <DeletePostButton postId = {id}/>
        </div>
    );
}