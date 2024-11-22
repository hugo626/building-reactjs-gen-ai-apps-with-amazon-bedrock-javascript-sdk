import {useState, useRef } from "react"

import { Box, Spinner, Header, Container, SpaceBetween, Textarea, Button, Input, FormField, Slider } from "@cloudscape-design/components"
import MessageList from "./MessageList"
import BedrockKBLoader from "./BedrockKBLoader";
import { getBedrockKnowledgeBaseRetriever, retrieveBedrockKnowledgeBase } from "./llmLib"
import FMPicker from "./FMPicker";
import { answerQuestionWithContext, getStandaloneQuestion } from "./questionGenerator";
import { buildContent, handleStreamingTokenResponse } from "./messageHelpers";
import { filterDocsByScore, filteredResultsByScore } from "./questionGenerator";
import PromptPicker from "./PromptPicker";

export default () => {

    const [scoreValue, setScoreValue] = useState(0.5)
    const [topKValue, setTopKValue] = useState(20)
    const [value, setValue] = useState("")
    const [loading, setLoading] = useState(false)
    const [llmResponse, setLLMResponse] = useState("")
    const [messages, setMessages] = useState([])

    const childRef = useRef(null);
    const childRef2 = useRef(null);
    const childRef3 = useRef(null);
    const promptPickerRef = useRef(null);

    const handleLLMNewToken = ({ type, content_block, delta }) => {
        handleStreamingTokenResponse({ type, content_block, delta }, setLLMResponse, setMessages, setLoading)
    }


    const sendText = async () => {
        setLoading(true)
        let currentKb = childRef.current.getSelectedOption()
        let currentModelId = childRef2.current.getModelId()
        let content = await buildContent(value, [])
        const customizedSystemPrompt = promptPickerRef.current.getPrompt()
        console.log(" systemPrompt:", customizedSystemPrompt);

        setValue("")
        setMessages(prev => [...prev,{ role: "user", content: content }])
        const question = await getStandaloneQuestion({modelId:currentModelId, messages:messages,  question:  value})
        console.log("standalone question:", question)
        setLLMResponse(msg => msg + `Anwsering: <strong>${value}</strong><br/>`)

        const response = await retrieveBedrockKnowledgeBase(currentKb.value, topKValue, value);

        const filteredResults = filteredResultsByScore(response.retrievalResults, scoreValue)
        console.log(" filteredResults:", filteredResults);

        const retriever = await getBedrockKnowledgeBaseRetriever(currentKb.value, topKValue)
        const docs = await retriever.invoke(question)   

        const filteredDocs = filterDocsByScore(docs, scoreValue)
        console.log(" docs:", docs)
        if (filteredDocs.length === 0) {
            let nodocs_msg = "I'm sorry. No Documents, so I don't know the answer to that question."
            setLLMResponse(msg => msg + `${nodocs_msg}`)
        } else {
            const answer  =  await answerQuestionWithContext({modelId: currentModelId,question: value, results:filteredResults, callbacks: [{ handleLLMNewToken }], prompt:customizedSystemPrompt})
            // console.log(answer)
        }

        childRef3.current.focus()
        setLoading(false)
    }


    const processKeyUp = (keyCode) => { if (keyCode === 13) sendText() }

    return (

        <Container key={2} disableContentPaddings={false}
            header={<Header variant="h2">Conversation</Header>}>

            <SpaceBetween size="xs">
                <BedrockKBLoader ref={childRef} key={1} />
                <FMPicker ref={childRef2} multimodal={true} key={3} />
                <PromptPicker ref={promptPickerRef} />
                <FormField label="Top K "
                description="The Top K value determines the number of documents the LLM should retrieve from the knowledge base in the first step. Each document returned includes a score that reflects its relevance to the question.">
                    <div className="flex-wrapper">
                        <div className="slider-wrapper">
                            <Slider
                                onChange={({ detail }) =>
                                    setTopKValue(detail.value)
                                }
                                value={topKValue}
                                max={50}
                                min={3}
                            />
                        </div>
                        <SpaceBetween
                        size="m"
                        alignItems="center"
                        direction="horizontal"
                        >
                        <div className="input-wrapper">
                            <Input type="number" inputMode="numeric" 
                                value={topKValue.toString()}
                                onChange={({ detail }) => setTopKValue(Number(detail.value))} />
                        </div>
                        </SpaceBetween>
                    </div>
                </FormField>

                <FormField label="MinScore " 
                 description="The MinScore value controls which documents are included for the LLM to generate the final answer. A value of 0 means any document will be included.">
                    <div className="flex-wrapper">
                        <div className="slider-wrapper">
                        <Slider
                            onChange={({ detail }) =>
                                setScoreValue(detail.value)
                            }
                            value={scoreValue}
                            max={1}
                            min={0}
                            step={0.1}
                        />
                        </div>
                        <SpaceBetween
                        size="m"
                        alignItems="center"
                        direction="horizontal"
                        >
                        <div className="input-wrapper">
                            <Input type="number" inputMode="decimal" 
                                value={scoreValue.toString()}
                                step={0.1}
                                onChange={({ detail }) => setScoreValue(Number(detail.value))}/>
                        </div>
                        </SpaceBetween>
                    </div>
                </FormField>
                
                <Box data-id="chat-window">
                    {
                        messages.length ?
                            <Container fitHeight>
                                <MessageList messages={messages} />
                                {loading ? <Spinner /> : null}
                            </Container>
                            : null                    }
                </Box>
                {
                    llmResponse !== "" ?
                        <Container fitHeight header={<strong>LLM Answer</strong>}>
                            <div dangerouslySetInnerHTML={{ __html: llmResponse }} />
                        </Container> :
                        null
                }
                <Textarea
                    fitHeight
                    onBlur={childRef3?.current?.focus()}
                    ref={childRef3}
                    placeholder="Write something to the model..."
                    onChange={({ detail }) => {setValue(detail.value) }}
                    onKeyUp={event => processKeyUp(event.detail.keyCode)}
                    value={value}
                    autoFocus
                    disabled={loading}
                    inputMode="text" />
                <Button fullWidth key={2} loading={loading} onClick={sendText} variant="primary" >Send</Button>
            </SpaceBetween>


        </Container>
    )
}
